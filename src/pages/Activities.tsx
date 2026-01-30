import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { useActivities } from '@/hooks/useActivities';
import { useAuth } from '@/contexts/AuthContext';
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
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { format, formatDistanceToNow, isToday, isBefore, isAfter, startOfDay } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity } from '@/types/database';

interface OutletContext {
  setSidebarOpen: (open: boolean) => void;
}

const Activities: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { activities, isLoading, respondToActivity, getUserResponse, updateActivity } = useActivities();
  const { setSidebarOpen } = useOutletContext<OutletContext>();
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [respondingActivityId, setRespondingActivityId] = useState<string | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [completingActivityId, setCompletingActivityId] = useState<string | null>(null);
  const [, setRefreshTrigger] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second for countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Calculate detailed remaining time
  const getDetailedRemainingTime = (scheduledAt: string): string => {
    const scheduled = new Date(scheduledAt);
    const diff = scheduled.getTime() - currentTime.getTime();
    
    if (diff <= 0) return '0 days, 0 hours, 0 minutes, 0 seconds';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`;
  };

  // Auto-refresh UI when an upcoming activity's scheduled time is reached
  useEffect(() => {
    if (activities.length === 0) return;

    // Find the next upcoming activity's scheduled time
    const now = new Date();
    const upcomingActivityTimes = activities
      .filter(a => a.status !== 'completed' && a.status !== 'cancelled' && a.scheduled_at)
      .map(a => new Date(a.scheduled_at).getTime())
      .filter(time => time > now.getTime());

    if (upcomingActivityTimes.length === 0) return;

    const nextEventTime = Math.min(...upcomingActivityTimes);
    const timeUntilNextEvent = nextEventTime - now.getTime();

    // Set a timer to refresh the UI at the next event time (with a 100ms buffer)
    const timer = setTimeout(() => {
      setRefreshTrigger(prev => prev + 1);
    }, timeUntilNextEvent + 100);

    return () => clearTimeout(timer);
  }, [activities]);
  const hasEventTimePassed = (activity: Activity): boolean => {
    if (!activity.scheduled_at) return false;
    const scheduledDateTime = new Date(activity.scheduled_at);
    const now = new Date();
    return scheduledDateTime < now;
  };

  // Helper function to determine if an activity should be shown as ongoing
  const isActivityOngoing = (activity: Activity): boolean => {
    if (!activity.scheduled_at) return false;
    const scheduledDate = new Date(activity.scheduled_at);
    const today = new Date();
    const scheduledDateStart = startOfDay(scheduledDate);
    const todayStart = startOfDay(today);
    
    // Activity is ongoing if:
    // 1. Status is already ongoing, OR
    // 2. Scheduled time has hit (scheduled_at <= now) AND it's still the same day as scheduled
    return activity.status === 'ongoing' ||
           (hasEventTimePassed(activity) && (isToday(scheduledDate) || isBefore(scheduledDateStart, todayStart)));
  };

  // Helper function to check if the event time has hit (scheduled time is now or in the past)
  const hasEventTimeHit = (activity: Activity): boolean => {
    if (!activity.scheduled_at) return false;
    const scheduledDateTime = new Date(activity.scheduled_at);
    const now = new Date();
    return scheduledDateTime <= now;
  };

  const upcomingActivities = activities.filter((a) => {
    if (a.status === 'completed' || a.status === 'cancelled') return false;
    // Show in upcoming if scheduled time hasn't been hit yet
    return !hasEventTimeHit(a);
  });
  
  const ongoingActivities = activities.filter((a) => {
    if (a.status === 'completed' || a.status === 'cancelled') return false;
    // Show in ongoing if event time has hit
    return hasEventTimeHit(a) && isActivityOngoing(a);
  });
  
  const pastActivities = activities.filter((a) => {
    // Include completed/cancelled activities
    return a.status === 'completed' || a.status === 'cancelled';
  });

  // Derive display status for UI to avoid mismatches when DB status lags
  const getDisplayStatus = (activity: Activity): 'upcoming' | 'ongoing' | 'completed' | 'cancelled' => {
    if (activity.status === 'completed' || activity.status === 'cancelled') return activity.status;
    return hasEventTimeHit(activity) && isActivityOngoing(activity) ? 'ongoing' : 'upcoming';
  };

  const handleAccept = async (activity: Activity) => {
    setRespondingActivityId(activity.id);
    await respondToActivity(activity.id, 'accepted');
    setRespondingActivityId(null);
  };

  const handleReject = async () => {
    if (!selectedActivity || !rejectionReason.trim()) return;

    setRespondingActivityId(selectedActivity.id);
    await respondToActivity(selectedActivity.id, 'rejected', rejectionReason);
    setRespondingActivityId(null);
    setShowRejectDialog(false);
    setRejectionReason('');
    setSelectedActivity(null);
  };

  const handleCompleteActivity = async (activity: Activity) => {
    setCompletingActivityId(activity.id);
    await updateActivity(activity.id, { status: 'completed' });
    setCompletingActivityId(null);
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
    const displayStatus = getDisplayStatus(activity);

    return (
      <Card key={activity.id} className="card-elevated animate-slide-up">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge
                  variant="outline"
                  className={
                    displayStatus === 'upcoming'
                      ? 'bg-success/10 text-success border-success/20'
                      : displayStatus === 'ongoing'
                      ? 'bg-warning/10 text-warning border-warning/20'
                      : displayStatus === 'completed'
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-destructive/10 text-destructive border-destructive/20'
                  }
                >
                  {displayStatus}
                </Badge>
                {getStatusBadge(activity)}
              </div>
              <CardTitle className="text-lg sm:text-xl break-words"><span className="font-bold">Activity Title :</span> {activity.title}</CardTitle>
              {activity.description && (
                <div className="text-muted-foreground mt-2 whitespace-pre-wrap break-words leading-none -space-y-1 text-sm sm:text-base">
                  <span className="font-bold">Activity Description :</span>{' '}
                  {activity.description.split('Winning option:').map((part, idx, arr) => (
                    <span key={idx}>
                      {part}
                      {idx < arr.length - 1 && <span className="font-bold">Winning option:</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-sm sm:text-base text-muted-foreground mt-4">
            {activity.scheduled_at && (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 w-full sm:w-auto">
                  <span className="font-bold whitespace-nowrap">Activity Scheduled Date & Time :</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {format(new Date(activity.scheduled_at), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
                {displayStatus === 'upcoming' && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 w-full sm:w-auto">
                    <span className="font-bold whitespace-nowrap">Activity Remaining Time :</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {getDetailedRemainingTime(activity.scheduled_at)}
                    </span>
                  </div>
                )}
              </>
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

          {displayStatus === 'upcoming' && !response && (
            <div className="flex gap-3">
              <Button
                variant="success"
                className="flex-1"
                onClick={() => handleAccept(activity)}
                disabled={respondingActivityId === activity.id}
              >
                {respondingActivityId === activity.id ? (
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
                disabled={respondingActivityId === activity.id}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </div>
          )}

          {displayStatus === 'upcoming' && response && (
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              {response.status === 'rejected' && (
                <Button
                  variant="success"
                  className="flex-1 text-sm sm:text-base"
                  onClick={() => handleAccept(activity)}
                  disabled={respondingActivityId === activity.id}
                >
                  {respondingActivityId === activity.id ? (
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
                  className="flex-1 border-destructive/30 text-destructive text-sm sm:text-base"
                  onClick={() => openRejectDialog(activity)}
                  disabled={respondingActivityId === activity.id}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Change to Reject
                </Button>
              )}
            </div>
          )}

          {/* Admin button to mark ongoing activity as complete */}
          {isAdmin && displayStatus === 'ongoing' && hasEventTimeHit(activity) && (
            <div className="mt-4">
              <Button
                variant="outline"
                className="w-full border-success/30 text-success"
                onClick={() => handleCompleteActivity(activity)}
                disabled={completingActivityId === activity.id}
              >
                {completingActivityId === activity.id ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Mark as Complete
              </Button>
            </div>
          )}

          {/* Participants preview */}
          {acceptedCount > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm font-medium mb-2">Participants</p>
              <div className="flex flex-wrap gap-2">
                {activity.participation
                  ?.filter((p) => p.status === 'accepted')
                  .map((p) => (
                    <Badge key={p.id} variant="outline" className="px-2 py-1">
                      {p.user?.full_name || 'Unknown'}
                    </Badge>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen">
      <Header 
        title="Activities" 
        subtitle="Manage your activity participation" 
        onMenuClick={() => setSidebarOpen(true)}
      />

      <div className="p-4 sm:p-6 lg:p-8">
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
              disabled={respondingActivityId !== null || !rejectionReason.trim()}
            >
              {respondingActivityId && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Activities;
