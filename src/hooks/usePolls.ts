import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ActivityPoll, PollOption, VoteBasic } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export const usePolls = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [polls, setPolls] = useState<ActivityPoll[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPolls = useCallback(async () => {
    try {
      const { data: pollsData, error: pollsError } = await supabase
        .from('activity_polls')
        .select(`
          *,
          creator:profiles!activity_polls_created_by_fkey(id, full_name, avatar_url, email),
          options:poll_options(
            *,
            votes(id, user_id)
          )
        `)
        .order('created_at', { ascending: false });

      if (pollsError) throw pollsError;

      const enrichedPolls: ActivityPoll[] = (pollsData || []).map((poll: any) => {
        const options = (poll.options || []).map((option: PollOption & { votes: VoteBasic[] }) => ({
          ...option,
          vote_count: option.votes?.length || 0,
        }));
        
        const totalVotes = options.reduce(
          (sum: number, opt: PollOption) => sum + (opt.vote_count || 0),
          0
        );

        return {
          ...poll,
          event_date: poll.event_date ?? null,
          event_time: poll.event_time ?? null,
          options,
          vote_count: totalVotes,
        } as ActivityPoll;
      });

      setPolls(enrichedPolls);
    } catch (error) {
      console.error('Error fetching polls:', error);
      toast({
        title: 'Error',
        description: 'Failed to load polls',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const createPoll = async (
    title: string,
    description: string,
    expiresAt: Date,
    options: { title: string; description?: string }[],
    eventDate?: string | null,
    eventTime?: string | null
  ) => {
    if (!user) return null;

    try {
      const { data: poll, error: pollError } = await supabase
        .from('activity_polls')
        .insert({
          title,
          description,
          expires_at: expiresAt.toISOString(),
          created_by: user.id,
          event_date: eventDate || null,
          event_time: eventTime || null,
        })
        .select()
        .single();

      if (pollError) throw pollError;

      const optionsToInsert = options.map((opt) => ({
        poll_id: poll.id,
        title: opt.title,
        description: opt.description || null,
      }));

      const { error: optionsError } = await supabase
        .from('poll_options')
        .insert(optionsToInsert);

      if (optionsError) throw optionsError;

      toast({
        title: 'Success',
        description: 'Poll created successfully',
      });

      await fetchPolls();
      return poll;
    } catch (error) {
      console.error('Error creating poll:', error);
      toast({
        title: 'Error',
        description: 'Failed to create poll',
        variant: 'destructive',
      });
      return null;
    }
  };

  const vote = async (pollId: string, optionId: string) => {
    if (!user) return false;

    try {
      // Check if user already voted
      const { data: existingVote } = await supabase
        .from('votes')
        .select('id')
        .eq('poll_id', pollId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingVote) {
        toast({
          title: 'Already voted',
          description: 'You have already voted on this poll',
          variant: 'destructive',
        });
        return false;
      }

      const { error } = await supabase.from('votes').insert({
        poll_id: pollId,
        option_id: optionId,
        user_id: user.id,
      });

      if (error) throw error;

      toast({
        title: 'Vote recorded',
        description: 'Your vote has been submitted',
      });

      await fetchPolls();
      return true;
    } catch (error) {
      console.error('Error voting:', error);
      toast({
        title: 'Error',
        description: 'Failed to record vote',
        variant: 'destructive',
      });
      return false;
    }
  };

  const changeVote = async (pollId: string, newOptionId: string) => {
    if (!user) return false;

    try {
      // Get the user's existing vote
      const { data: existingVote, error: fetchError } = await supabase
        .from('votes')
        .select('id, option_id')
        .eq('poll_id', pollId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!existingVote) {
        toast({
          title: 'No existing vote',
          description: 'You haven\'t voted on this poll yet',
          variant: 'destructive',
        });
        return false;
      }

      // Update the vote to the new option
      const { error: updateError } = await supabase
        .from('votes')
        .update({ option_id: newOptionId })
        .eq('id', existingVote.id);

      if (updateError) throw updateError;

      toast({
        title: 'Vote changed',
        description: 'Your vote has been updated',
      });

      await fetchPolls();
      return true;
    } catch (error) {
      console.error('Error changing vote:', error);
      toast({
        title: 'Error',
        description: 'Failed to change vote',
        variant: 'destructive',
      });
      return false;
    }
  };

  const closePoll = async (pollId: string) => {
    try {
      const { error } = await supabase
        .from('activity_polls')
        .update({ status: 'closed' })
        .eq('id', pollId);

      if (error) throw error;

      toast({
        title: 'Poll closed',
        description: 'The poll has been closed',
      });

      await fetchPolls();
    } catch (error) {
      console.error('Error closing poll:', error);
      toast({
        title: 'Error',
        description: 'Failed to close poll',
        variant: 'destructive',
      });
    }
  };

  const getUserVote = useCallback(
    (pollId: string): string | null => {
      if (!user) return null;
      const poll = polls.find((p) => p.id === pollId);
      if (!poll?.options) return null;

      for (const option of poll.options) {
        const vote = option.votes?.find((v) => v.user_id === user.id);
        if (vote) return option.id;
      }
      return null;
    },
    [polls, user]
  );

  useEffect(() => {
    fetchPolls();

    // Subscribe to real-time updates
    const pollsChannel = supabase
      .channel('polls-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity_polls' },
        () => fetchPolls()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'votes' },
        () => fetchPolls()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'poll_options' },
        () => fetchPolls()
      )
      .subscribe();

    // Check for expired polls every 30 seconds
    const checkExpiredPolls = async () => {
      try {
        // Call the process_expired_polls function
        const { error } = await supabase.rpc('process_expired_polls');
        if (error) {
          console.error('Error processing expired polls:', error);
        }
      } catch (error) {
        console.error('Error checking expired polls:', error);
      }
    };

    // Initial check
    checkExpiredPolls();

    // Set up interval to check every 30 seconds
    const pollCheckInterval = setInterval(checkExpiredPolls, 30000);

    return () => {
      supabase.removeChannel(pollsChannel);
      clearInterval(pollCheckInterval);
    };
  }, [fetchPolls]);

  return {
    polls,
    isLoading,
    createPoll,
    vote,
    changeVote,
    closePoll,
    getUserVote,
    refetch: fetchPolls,
  };
};
