import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import { useActivities } from '@/hooks/useActivities';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity } from '@/types/database';

const Activities: React.FC = () => {
  const { user } = useAuth();
  const { activities, isLoading, respondToActivity, getUserResponse } = useActivities();
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isResponding, setIsResponding] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const upcomingActivities = activities.filter((a) => a.status === 'upcoming');
  const ongoingActivities = activities.filter((a) => a.status === 'ongoing');
  const pastActivities = activities.filter(
    (a) => a.status === 'completed' || a.status === 'cancelled'
  );

  const handleAccept = async (activity: Activity) => {
    setIsResponding(true);
    await respondToActivity(activity.id, 'accepted');
    setIsResponding(false);
  };

  const handleReject = async () => {
    if (!selectedActivity || !rejectionReason.trim()) return;

    setIsResponding(true);
    await respondToActivity(selectedActivity.id, 'rejected', rejectionReason);
    setIsResponding(false);
    setShowRejectDialog(false);
    setRejectionReason('');
    setSelectedActivity(null);
  };

  const openRejectDialog = (activity: Activity) => {
    setSelectedActivity(activity);
    setShowRejectDialog(true);
  };

  const getStatusBadge = (activity: Activity) => {
    const response = getUserResponse(activity.id);

    if (!response) {
      return (
        <Badge variant="outline" className="status-pending">
          Pending Response
        </Badge>
      );
    }

    if (response.status === 'accepted') {
      return (
        <Badge variant="outline" className="status-accepted">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Accepted
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="status-rejected">
        <XCircle className="w-3 h-3 mr-1" />
        Rejected
      </Badge>
    );
  };

  const renderActivityCard = (activity: Activity) => {
    const response = getUserResponse(activity.id);
    const acceptedCount = activity.participation?.filter((p) => p.status === 'accepted').length || 0;

    return (
      <Card key={activity.id} className="card-elevated animate-slide-up">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge
                  variant="outline"
                  className={
                    activity.status === 'upcoming'
                      ? 'bg-success/10 text-success border-success/20'
                      : activity.status === 'ongoing'
                      ? 'bg-warning/10 text-warning border-warning/20'
                      : activity.status === 'completed'
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-destructive/10 text-destructive border-destructive/20'
                  }
                >
                  {activity.status}
                </Badge>
                {getStatusBadge(activity)}
              </div>
              <CardTitle className="text-xl">{activity.title}</CardTitle>
              {activity.description && (
                <p className="text-muted-foreground mt-2">{activity.description}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-4">
            {activity.scheduled_at && (
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {format(new Date(activity.scheduled_at), 'MMM d, yyyy h:mm a')}
              </span>
            )}
            {activity.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {activity.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {acceptedCount} participating
            </span>
          </div>
        </CardHeader>

        <CardContent>
          {response?.status === 'rejected' && response.rejection_reason && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-destructive">Reason:</span>{' '}
                {response.rejection_reason}
              </p>
            </div>
          )}

          {activity.status === 'upcoming' && !response && (
            <div className="flex gap-3">
              <Button
                variant="success"
                className="flex-1"
                onClick={() => handleAccept(activity)}
                disabled={isResponding}
              >
                {isResponding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Accept
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                onClick={() => openRejectDialog(activity)}
                disabled={isResponding}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </div>
          )}

          {activity.status === 'upcoming' && response && (
            <div className="flex gap-3">
              {response.status === 'rejected' && (
                <Button
                  variant="success"
                  className="flex-1"
                  onClick={() => handleAccept(activity)}
                  disabled={isResponding}
                >
                  {isResponding ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Change to Accept
                    </>
                  )}
                </Button>
              )}
              {response.status === 'accepted' && (
                <Button
                  variant="outline"
                  className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={() => openRejectDialog(activity)}
                  disabled={isResponding}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Change to Reject
                </Button>
              )}
            </div>
          )}

          {/* Participants preview */}
          {acceptedCount > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm font-medium mb-2">Participants</p>
              <div className="flex -space-x-2">
                {activity.participation
                  ?.filter((p) => p.status === 'accepted')
                  .slice(0, 8)
                  .map((p) => (
                    <Avatar key={p.id} className="w-8 h-8 ring-2 ring-background">
                      <AvatarImage src={p.user?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {p.user?.full_name?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                {acceptedCount > 8 && (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium ring-2 ring-background">
                    +{acceptedCount - 8}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen">
      <Header title="Activities" subtitle="Manage your activity participation" />

      <div className="p-8">
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="upcoming">
              Upcoming ({upcomingActivities.length})
            </TabsTrigger>
            <TabsTrigger value="ongoing">
              Ongoing ({ongoingActivities.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past ({pastActivities.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-6">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-64 w-full" />
              ))
            ) : upcomingActivities.length === 0 ? (
              <Card className="card-elevated">
                <CardContent className="py-16 text-center">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-xl font-semibold mb-2">No Upcoming Activities</h3>
                  <p className="text-muted-foreground">
                    New activities will appear here when they're scheduled
                  </p>
                </CardContent>
              </Card>
            ) : (
              upcomingActivities.map(renderActivityCard)
            )}
          </TabsContent>

          <TabsContent value="ongoing" className="space-y-6">
            {isLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-64 w-full" />
              ))
            ) : ongoingActivities.length === 0 ? (
              <Card className="card-elevated">
                <CardContent className="py-16 text-center">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-xl font-semibold mb-2">No Ongoing Activities</h3>
                  <p className="text-muted-foreground">
                    Activities in progress will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              ongoingActivities.map(renderActivityCard)
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-6">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-64 w-full" />
              ))
            ) : pastActivities.length === 0 ? (
              <Card className="card-elevated">
                <CardContent className="py-16 text-center">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-xl font-semibold mb-2">No Past Activities</h3>
                  <p className="text-muted-foreground">
                    Completed activities will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              pastActivities.map(renderActivityCard)
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Rejection Reason Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Reject Activity
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for not participating in "{selectedActivity?.title}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (required)</Label>
              <Textarea
                id="reason"
                placeholder="e.g., Prior commitment, health reasons, etc."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isResponding || !rejectionReason.trim()}
            >
              {isResponding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Activities;
