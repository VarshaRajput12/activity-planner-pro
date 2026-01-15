import React from 'react';
import Header from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { usePolls } from '@/hooks/usePolls';
import { useActivities } from '@/hooks/useActivities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Vote,
  Calendar,
  Users,
  Trophy,
  ArrowRight,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const Dashboard: React.FC = () => {
  const { profile, isAdmin } = useAuth();
  const { polls, isLoading: pollsLoading } = usePolls();
  const { activities, isLoading: activitiesLoading, getUserResponse } = useActivities();

  const activePolls = polls.filter((p) => p.status === 'active' && !isPast(new Date(p.expires_at)));
  const upcomingActivities = activities.filter((a) => a.status === 'upcoming');
  
  const stats = [
    {
      label: 'Active Polls',
      value: activePolls.length,
      icon: Vote,
      color: 'text-accent',
      bg: 'bg-accent/10',
    },
    {
      label: 'Upcoming Activities',
      value: upcomingActivities.length,
      icon: Calendar,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      label: 'Your Responses',
      value: activities.filter((a) => getUserResponse(a.id)).length,
      icon: Users,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
    {
      label: 'Total Activities',
      value: activities.length,
      icon: Trophy,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
  ];

  return (
    <div className="min-h-screen">
      <Header
        title={`Welcome back, ${profile?.full_name?.split(' ')[0] || 'User'}!`}
        subtitle="Here's what's happening with your meetups"
      />

      <div className="p-8 space-y-8 animate-fade-in">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Active Polls */}
          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Vote className="w-5 h-5 text-accent" />
                Active Polls
              </CardTitle>
              <Link to="/polls">
                <Button variant="ghost" size="sm">
                  View all <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {pollsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))
              ) : activePolls.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Vote className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No active polls</p>
                </div>
              ) : (
                activePolls.slice(0, 3).map((poll) => (
                  <Link
                    key={poll.id}
                    to={`/polls/${poll.id}`}
                    className="block p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold">{poll.title}</h4>
                      <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
                        {poll.vote_count} votes
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatDistanceToNow(new Date(poll.expires_at), { addSuffix: true })}
                      </span>
                      <span>{poll.options?.length || 0} options</span>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          {/* Upcoming Activities */}
          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-success" />
                Upcoming Activities
              </CardTitle>
              <Link to="/activities">
                <Button variant="ghost" size="sm">
                  View all <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {activitiesLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))
              ) : upcomingActivities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No upcoming activities</p>
                </div>
              ) : (
                upcomingActivities.slice(0, 3).map((activity) => {
                  const response = getUserResponse(activity.id);
                  return (
                    <Link
                      key={activity.id}
                      to={`/activities/${activity.id}`}
                      className="block p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold">{activity.title}</h4>
                        {response && (
                          <Badge
                            variant="outline"
                            className={
                              response.status === 'accepted'
                                ? 'status-accepted'
                                : response.status === 'rejected'
                                ? 'status-rejected'
                                : 'status-pending'
                            }
                          >
                            {response.status === 'accepted' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                            {response.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                            {response.status}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {activity.scheduled_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {format(new Date(activity.scheduled_at), 'MMM d, h:mm a')}
                          </span>
                        )}
                        {activity.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {activity.location}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        {isAdmin && (
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <Link to="/polls/create">
                <Button variant="accent">
                  <Vote className="w-4 h-4 mr-2" />
                  Create Poll
                </Button>
              </Link>
              <Link to="/admin/activities/create">
                <Button variant="secondary">
                  <Calendar className="w-4 h-4 mr-2" />
                  Create Activity
                </Button>
              </Link>
              <Link to="/admin/users">
                <Button variant="outline">
                  <Users className="w-4 h-4 mr-2" />
                  Manage Users
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
