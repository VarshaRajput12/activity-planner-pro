import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { usePolls } from '@/hooks/usePolls';
import { useActivities } from '@/hooks/useActivities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Calendar,
  Vote,
  Users,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Trophy,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

const AdminDashboard: React.FC = () => {
  const { isAdmin, user } = useAuth();
  const { polls, closePoll, deletePoll } = usePolls();
  const { activities, createActivity, deleteActivity } = useActivities();

  const [isCreateActivityOpen, setIsCreateActivityOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'poll' | 'activity'; id: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newActivity, setNewActivity] = useState({
    title: '',
    description: '',
    location: '',
    scheduledAt: '',
  });

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    const success = 
      deleteTarget.type === 'poll'
        ? await deletePoll(deleteTarget.id)
        : await deleteActivity(deleteTarget.id);

    if (success) {
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
    }
    setIsDeleting(false);
  };

  const openDeleteConfirm = (type: 'poll' | 'activity', id: string) => {
    setDeleteTarget({ type, id });
    setDeleteConfirmOpen(true);
  };

  const activePolls = polls.filter((p) => p.status === 'active' && !isPast(new Date(p.expires_at)));
  const resolvedPolls = polls.filter((p) => p.status !== 'active' || isPast(new Date(p.expires_at)));

  const handleCreateActivity = async () => {
    if (!newActivity.title) return;

    setIsCreating(true);
    const result = await createActivity(
      newActivity.title,
      newActivity.description || null,
      newActivity.location || null,
      newActivity.scheduledAt ? new Date(newActivity.scheduledAt) : null
    );

    if (result) {
      setIsCreateActivityOpen(false);
      setNewActivity({ title: '', description: '', location: '', scheduledAt: '' });
    }
    setIsCreating(false);
  };

  const handleCreateActivityFromPoll = async (poll: typeof polls[0], optionId: string) => {
    const option = poll.options?.find((o) => o.id === optionId);
    if (!option) return;

    // Build scheduled_at from poll's event_date and event_time
    let scheduledAt: Date | null = null;
    if (poll.event_date) {
      try {
        // event_date is typically in format: "2026-01-17" or "2026-01-17T00:00:00+00"
        // event_time is typically in format: "19:15:00"
        let dateTimeStr: string;
        
        // Extract just the date part if it has time included
        const datePart = poll.event_date.split('T')[0];
        const timePart = poll.event_time ? poll.event_time.split('+')[0] : '00:00:00';
        
        dateTimeStr = `${datePart}T${timePart}`;
        scheduledAt = new Date(dateTimeStr);
        
        // Validate the date is valid
        if (isNaN(scheduledAt.getTime())) {
          scheduledAt = null;
        }
      } catch (error) {
        console.error('Error parsing event date/time:', error);
        scheduledAt = null;
      }
    }

    // Build description combining poll and option details
    const description = [
      poll.description,
      option.description,
      `Winning option: ${option.title}`
    ]
      .filter(Boolean)
      .join('\n\n');

    const result = await createActivity(
      poll.title || option.title,
      description || null,
      null,
      scheduledAt,
      poll.id,
      optionId
    );

    if (result) {
      await closePoll(poll.id);
    }
  };

  const stats = [
    {
      label: 'Active Polls',
      value: activePolls.length,
      icon: Vote,
      color: 'text-accent',
      bg: 'bg-accent/10',
    },
    {
      label: 'Total Activities',
      value: activities.length,
      icon: Calendar,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      label: 'Pending Responses',
      value: activities.reduce(
        (sum, a) =>
          sum + (a.participation?.filter((p) => p.status === 'pending').length || 0),
        0
      ),
      icon: Users,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
  ];

  return (
    <div className="min-h-screen">
      <Header
        title="Admin Dashboard"
        subtitle="Manage polls, activities, and users"
      />

      <div className="p-8 space-y-8 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {stats.map((stat) => (
            <Card key={stat.label} className="card-elevated">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Button variant="accent" onClick={() => setIsCreateActivityOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Activity
            </Button>
          </CardContent>
        </Card>

        {/* Poll Resolution */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Vote className="w-5 h-5 text-accent" />
              Poll Resolution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="active">
              <TabsList className="mb-4">
                <TabsTrigger value="active">Active ({activePolls.length})</TabsTrigger>
                <TabsTrigger value="resolved">Resolved ({resolvedPolls.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="space-y-4">
                {activePolls.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No active polls to resolve
                  </p>
                ) : (
                  activePolls.map((poll) => {
                    const totalVotes = poll.vote_count || 0;
                    const sortedOptions = [...(poll.options || [])].sort(
                      (a, b) => (b.vote_count || 0) - (a.vote_count || 0)
                    );
                    const topOption = sortedOptions[0];
                    const topVotePercentage =
                      totalVotes > 0 && topOption
                        ? ((topOption.vote_count || 0) / totalVotes) * 100
                        : 0;
                    const isEligible = topVotePercentage >= 50 || totalVotes > 0;

                    return (
                      <div
                        key={poll.id}
                        className="p-4 rounded-lg border border-border"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className="font-semibold">{poll.title}</h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span>{totalVotes} votes</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                Ends {formatDistanceToNow(new Date(poll.expires_at), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                          {isEligible && (
                            <Badge className="bg-success/10 text-success border-success/20">
                              Eligible for Resolution
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-2 mb-4">
                          {sortedOptions.slice(0, 3).map((option) => {
                            const percentage =
                              totalVotes > 0
                                ? ((option.vote_count || 0) / totalVotes) * 100
                                : 0;

                            return (
                              <div key={option.id} className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                  <span>{option.title}</span>
                                  <span className="text-muted-foreground">
                                    {option.vote_count || 0} ({percentage.toFixed(0)}%)
                                  </span>
                                </div>
                                <Progress value={percentage} className="h-2" />
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex gap-2">
                          {topOption && (
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => handleCreateActivityFromPoll(poll, topOption.id)}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Accept "{topOption.title}"
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => closePoll(poll.id)}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Close Poll
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDeleteConfirm('poll', poll.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </TabsContent>

              <TabsContent value="resolved" className="space-y-4">
                {resolvedPolls.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No resolved polls yet
                  </p>
                ) : (
                  resolvedPolls.slice(0, 5).map((poll) => (
                    <div
                      key={poll.id}
                      className="p-4 rounded-lg border border-border bg-muted/30"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">{poll.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {poll.vote_count} votes • Closed{' '}
                            {formatDistanceToNow(new Date(poll.expires_at), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Closed</Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDeleteConfirm('poll', poll.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-success" />
              Recent Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No activities created yet
              </p>
            ) : (
              <div className="space-y-4">
                {activities.slice(0, 5).map((activity) => {
                  const acceptedCount =
                    activity.participation?.filter((p) => p.status === 'accepted').length || 0;
                  const rejectedCount =
                    activity.participation?.filter((p) => p.status === 'rejected').length || 0;

                  return (
                    <div
                      key={activity.id}
                      className="p-4 rounded-lg border border-border"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold">{activity.title}</h4>
                          {activity.scheduled_at && (
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(activity.scheduled_at), 'MMM d, yyyy h:mm a')}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={
                              activity.status === 'upcoming'
                                ? 'bg-success/10 text-success border-success/20'
                                : 'bg-muted text-muted-foreground'
                            }
                          >
                            {activity.status}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDeleteConfirm('activity', activity.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1 text-success">
                          <CheckCircle2 className="w-4 h-4" />
                          {acceptedCount} accepted
                        </span>
                        <span className="flex items-center gap-1 text-destructive">
                          <XCircle className="w-4 h-4" />
                          {rejectedCount} rejected
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Activity Dialog */}
      <Dialog open={isCreateActivityOpen} onOpenChange={setIsCreateActivityOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Activity</DialogTitle>
            <DialogDescription>
              Manually create an activity without going through a poll
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Activity Title</Label>
              <Input
                id="title"
                placeholder="e.g., Team Building Event"
                value={newActivity.title}
                onChange={(e) =>
                  setNewActivity((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Add more details..."
                value={newActivity.description}
                onChange={(e) =>
                  setNewActivity((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location (optional)</Label>
              <Input
                id="location"
                placeholder="e.g., Conference Room A"
                value={newActivity.location}
                onChange={(e) =>
                  setNewActivity((prev) => ({ ...prev, location: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduledAt">Scheduled Date & Time (optional)</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={newActivity.scheduledAt}
                onChange={(e) =>
                  setNewActivity((prev) => ({ ...prev, scheduledAt: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateActivityOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="accent"
              onClick={handleCreateActivity}
              disabled={isCreating || !newActivity.title}
            >
              {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.type === 'poll' ? 'Poll' : 'Activity'}?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The {deleteTarget?.type === 'poll' ? 'poll' : 'activity'} and all its associated data will be permanently deleted.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
