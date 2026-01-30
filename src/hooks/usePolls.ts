import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ActivityPoll, PollOption, VoteBasic } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export const usePolls = () => {
  const { user, isAdmin } = useAuth();
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

      if (isAdmin && user) {
        for (const poll of enrichedPolls) {
          try {
            if (poll.status !== 'active') continue;

            const totalVotes = poll.vote_count || 0;
            const yesOption = (poll.options || []).find(
              (o) => o.title.toLowerCase() === 'yes'
            );
            const yesVotes = yesOption?.vote_count || 0;
            const yesPct = totalVotes > 0 ? (yesVotes / totalVotes) * 100 : 0;
            const isExpired = new Date(poll.expires_at).getTime() <= Date.now();

            const { data: existingActivity } = await supabase
              .from('activities')
              .select('id')
              .eq('poll_id', poll.id)
              .maybeSingle();

            if (existingActivity) continue;

            const winningOption = yesOption;

            if (!winningOption) continue;
            if (!(isExpired && yesPct >= 50)) continue;

            let scheduledAtIso: string | null = null;
            try {
              if (poll.event_date) {
                const datePart = poll.event_date.split('T')[0];
                let timePart = poll.event_time ? poll.event_time.split('+')[0] : '00:00:00';
                if (timePart && timePart.length === 5) {
                  timePart = `${timePart}:00`;
                }
                const dateTimeStr = `${datePart}T${timePart}`;
                const scheduledDate = new Date(dateTimeStr);
                if (!isNaN(scheduledDate.getTime())) {
                  scheduledAtIso = scheduledDate.toISOString();
                }
              }
            } catch {}

            const descriptionParts = [
              poll.description || null,
              `Winning option: ${winningOption.title}`,
              winningOption.description || null,
            ].filter(Boolean);

            const { error: createError } = await supabase
              .from('activities')
              .insert({
                title: poll.title,
                description: descriptionParts.length ? descriptionParts.join('\n\n') : null,
                location: null,
                scheduled_at: scheduledAtIso,
                created_by: user.id,
                poll_id: poll.id,
                poll_option_id: winningOption.id,
              });

            if (!createError) {
              await supabase
                .from('activity_polls')
                .update({ status: 'resolved' })
                .eq('id', poll.id);
            }
          } catch (e) {
            console.error('Auto-create activity from poll failed', e);
          }
        }
      }
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

  const deletePoll = async (pollId: string) => {
    try {
      const { error } = await supabase
        .from('activity_polls')
        .delete()
        .eq('id', pollId);

      if (error) throw error;

      toast({
        title: 'Poll deleted',
        description: 'The poll has been deleted successfully',
      });

      await fetchPolls();
      return true;
    } catch (error) {
      console.error('Error deleting poll:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete poll',
        variant: 'destructive',
      });
      return false;
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

    // Client-side fetch already auto-creates on expiry for admins when Yes ≥ 50%
    // No periodic RPC call needed here
    const pollCheckInterval = setInterval(() => fetchPolls(), 30000);

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
    deletePoll,
    getUserVote,
    refetch: fetchPolls,
  };
};
