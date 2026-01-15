import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Activity, ProfileMinimal } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

interface LeaderboardParticipant {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  rank: number | null;
}

interface LeaderboardData {
  activity: Activity;
  participants: LeaderboardParticipant[];
}

interface ParticipationRecord {
  user_id: string;
  status: string;
  user?: ProfileMinimal;
}

interface LeaderboardRecord {
  user_id: string;
  rank: number | null;
}

export const useLeaderboard = () => {
  const { toast } = useToast();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    try {
      // Fetch completed activities with accepted participants
      const { data: activities, error: activitiesError } = await supabase
        .from('activities')
        .select(`
          *,
          participation:activity_participation(
            user_id,
            status,
            user:profiles(id, full_name, avatar_url)
          ),
          leaderboard:leaderboard_entries(
            user_id,
            rank
          )
        `)
        .order('scheduled_at', { ascending: false });

      if (activitiesError) throw activitiesError;

      const leaderboard: LeaderboardData[] = (activities || []).map((activity) => {
        const participationList = (activity.participation || []) as ParticipationRecord[];
        const leaderboardList = (activity.leaderboard || []) as LeaderboardRecord[];
        
        const acceptedParticipants = participationList
          .filter((p) => p.status === 'accepted')
          .map((p) => {
            const leaderboardEntry = leaderboardList.find(
              (l) => l.user_id === p.user_id
            );
            return {
              user_id: p.user_id,
              full_name: p.user?.full_name || null,
              avatar_url: p.user?.avatar_url || null,
              rank: leaderboardEntry?.rank || null,
            };
          })
          // Sort by rank (ranked users first, then unranked)
          .sort((a, b) => {
            if (a.rank && b.rank) return a.rank - b.rank;
            if (a.rank) return -1;
            if (b.rank) return 1;
            return 0;
          });

        // Create a clean activity object
        const cleanActivity: Activity = {
          id: activity.id,
          title: activity.title,
          description: activity.description,
          location: activity.location,
          scheduled_at: activity.scheduled_at,
          status: activity.status,
          created_by: activity.created_by,
          poll_id: activity.poll_id,
          poll_option_id: activity.poll_option_id,
          created_at: activity.created_at,
          updated_at: activity.updated_at,
        };

        return {
          activity: cleanActivity,
          participants: acceptedParticipants,
        };
      });

      setLeaderboardData(leaderboard);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      toast({
        title: 'Error',
        description: 'Failed to load leaderboard',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const setRank = async (activityId: string, userId: string, rank: number | null, markedBy: string) => {
    try {
      // Check if entry exists
      const { data: existing } = await supabase
        .from('leaderboard_entries')
        .select('id')
        .eq('activity_id', activityId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        if (rank === null) {
          // Remove rank
          const { error } = await supabase
            .from('leaderboard_entries')
            .delete()
            .eq('id', existing.id);

          if (error) throw error;
        } else {
          // Update rank
          const { error } = await supabase
            .from('leaderboard_entries')
            .update({ rank, marked_by: markedBy })
            .eq('id', existing.id);

          if (error) throw error;
        }
      } else if (rank !== null) {
        // Create new entry
        const { error } = await supabase.from('leaderboard_entries').insert({
          activity_id: activityId,
          user_id: userId,
          rank,
          marked_by: markedBy,
        });

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: rank ? `Rank ${rank} assigned` : 'Rank removed',
      });

      await fetchLeaderboard();
    } catch (error) {
      console.error('Error setting rank:', error);
      toast({
        title: 'Error',
        description: 'Failed to update rank',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return {
    leaderboardData,
    isLoading,
    setRank,
    refetch: fetchLeaderboard,
  };
};
