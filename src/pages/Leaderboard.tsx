import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Trophy,
  Medal,
  Award,
  Calendar,
  Users,
  Search,
  Filter,
} from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const getRankIcon = (rank: number | null) => {
  if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
  if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
  return null;
};

const getRankBadgeClass = (rank: number | null) => {
  if (rank === 1) return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
  if (rank === 2) return 'bg-gray-400/10 text-gray-500 border-gray-400/20';
  if (rank === 3) return 'bg-amber-600/10 text-amber-700 border-amber-600/20';
  return '';
};

interface OutletContext {
  setSidebarOpen: (open: boolean) => void;
}

const Leaderboard: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { leaderboardData, isLoading, setRank } = useLeaderboard();
  const { setSidebarOpen } = useOutletContext<OutletContext>();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActivity, setFilterActivity] = useState<string>('all');

  const filteredData = leaderboardData.filter((item) => {
    if (filterActivity !== 'all' && item.activity.id !== filterActivity) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        item.activity.title.toLowerCase().includes(query) ||
        item.participants.some((p) =>
          p.full_name?.toLowerCase().includes(query)
        )
      );
    }
    return true;
  });

  const handleSetRank = async (activityId: string, userId: string, rank: number | null) => {
    if (!user) return;
    await setRank(activityId, userId, rank, user.id);
  };

  return (
    <div className="min-h-screen">
      <Header
        title="Leaderboard"
        subtitle="Top performers across all activities"
        onMenuClick={() => setSidebarOpen(true)}
      />

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search activities or participants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterActivity} onValueChange={setFilterActivity}>
            <SelectTrigger className="w-full sm:w-64">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by activity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              {leaderboardData.map((item) => (
                <SelectItem key={item.activity.id} value={item.activity.id}>
                  {item.activity.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Leaderboard Cards */}
        <div className="space-y-6">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))
          ) : filteredData.length === 0 ? (
            <Card className="card-elevated">
              <CardContent className="py-16 text-center">
                <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-xl font-semibold mb-2">No Leaderboard Data</h3>
                <p className="text-muted-foreground">
                  {searchQuery || filterActivity !== 'all'
                    ? 'No results match your search'
                    : 'Complete activities to see the leaderboard'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredData.map((item) => (
              <Card key={item.activity.id} className="card-elevated animate-slide-up">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant="outline"
                          className={
                            item.activity.status === 'completed'
                              ? 'bg-success/10 text-success border-success/20'
                              : 'bg-accent/10 text-accent border-accent/20'
                          }
                        >
                          {item.activity.status}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl">{item.activity.title}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {item.activity.scheduled_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(item.activity.scheduled_at), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {item.participants.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No participants yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {item.participants.map((participant, index) => (
                        <div
                          key={participant.user_id}
                          className={`flex items-center justify-between p-4 rounded-lg border ${
                            participant.rank
                              ? 'bg-muted/50 border-accent/20'
                              : 'border-border'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <Avatar className="w-12 h-12">
                                <AvatarImage src={participant.avatar_url || undefined} />
                                <AvatarFallback>
                                  {participant.full_name?.[0] || '?'}
                                </AvatarFallback>
                              </Avatar>
                              {participant.rank && (
                                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-background flex items-center justify-center border-2 border-accent">
                                  <span className="text-xs font-bold text-accent">
                                    {participant.rank}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium">
                                {participant.full_name || 'Unknown User'}
                              </p>
                              {participant.rank && (
                                <Badge
                                  variant="outline"
                                  className={getRankBadgeClass(participant.rank)}
                                >
                                  {getRankIcon(participant.rank)}
                                  <span className="ml-1">
                                    {participant.rank === 1
                                      ? '1st Place'
                                      : participant.rank === 2
                                      ? '2nd Place'
                                      : '3rd Place'}
                                  </span>
                                </Badge>
                              )}
                            </div>
                          </div>

                          {isAdmin && (
                            <div className="flex items-center gap-2">
                              {[1, 2, 3].map((rank) => (
                                <Button
                                  key={rank}
                                  variant={participant.rank === rank ? 'default' : 'outline'}
                                  size="sm"
                                  className={
                                    participant.rank === rank
                                      ? 'bg-accent hover:bg-accent/90'
                                      : ''
                                  }
                                  onClick={() =>
                                    handleSetRank(
                                      item.activity.id,
                                      participant.user_id,
                                      participant.rank === rank ? null : rank
                                    )
                                  }
                                >
                                  #{rank}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
