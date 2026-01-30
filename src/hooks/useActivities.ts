import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Activity, ActivityParticipation, ParticipationStatus } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export const useActivities = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          creator:profiles!activities_created_by_fkey(id, full_name, avatar_url, email),
          participation:activity_participation(
            id,
            activity_id,
            user_id,
            status,
            rejection_reason,
            responded_at,
            created_at,
            user:profiles(id, full_name, avatar_url)
          )
        `)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      setActivities((data || []) as unknown as Activity[]);
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast({
        title: 'Error',
        description: 'Failed to load activities',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const createActivity = async (
    title: string,
    description: string | null,
    location: string | null,
    scheduledAt: Date | null,
    pollId?: string,
    pollOptionId?: string
  ) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('activities')
        .insert({
          title,
          description,
          location,
          scheduled_at: scheduledAt?.toISOString() || null,
          created_by: user.id,
          poll_id: pollId || null,
          poll_option_id: pollOptionId || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Activity created successfully',
      });

      await fetchActivities();
      return data;
    } catch (error) {
      console.error('Error creating activity:', error);
      toast({
        title: 'Error',
        description: 'Failed to create activity',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateActivity = async (
    id: string,
    updates: Partial<Activity>
  ) => {
    try {
      const { error } = await supabase
        .from('activities')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Activity updated successfully',
      });

      await fetchActivities();
    } catch (error) {
      console.error('Error updating activity:', error);
      toast({
        title: 'Error',
        description: 'Failed to update activity',
        variant: 'destructive',
      });
    }
  };

  const respondToActivity = async (
    activityId: string,
    status: ParticipationStatus,
    rejectionReason?: string
  ) => {
    if (!user) return false;

    try {
      // Check if user already responded
      const { data: existing } = await supabase
        .from('activity_participation')
        .select('id')
        .eq('activity_id', activityId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Update existing response
        const { error } = await supabase
          .from('activity_participation')
          .update({
            status,
            rejection_reason: status === 'rejected' ? rejectionReason : null,
            responded_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new response
        const { error } = await supabase.from('activity_participation').insert({
          activity_id: activityId,
          user_id: user.id,
          status,
          rejection_reason: status === 'rejected' ? rejectionReason : null,
          responded_at: new Date().toISOString(),
        });

        if (error) throw error;
      }

      toast({
        title: 'Response recorded',
        description: `You have ${status} this activity`,
      });

      await fetchActivities();
      return true;
    } catch (error) {
      console.error('Error responding to activity:', error);
      toast({
        title: 'Error',
        description: 'Failed to record response',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteActivity = async (activityId: string) => {
    try {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', activityId);

      if (error) throw error;

      toast({
        title: 'Activity deleted',
        description: 'The activity has been deleted successfully',
      });

      await fetchActivities();
      return true;
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete activity',
        variant: 'destructive',
      });
      return false;
    }
  };

  const getUserResponse = useCallback(
    (activityId: string): ActivityParticipation | null => {
      if (!user) return null;
      const activity = activities.find((a) => a.id === activityId);
      return activity?.participation?.find((p) => p.user_id === user.id) || null;
    },
    [activities, user]
  );

  useEffect(() => {
    fetchActivities();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('activities-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activities' },
        () => fetchActivities()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity_participation' },
        () => fetchActivities()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchActivities]);

  return {
    activities,
    isLoading,
    createActivity,
    updateActivity,
    respondToActivity,
    deleteActivity,
    getUserResponse,
    refetch: fetchActivities,
  };
};
