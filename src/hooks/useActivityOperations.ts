import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';

interface ActivityPayload {
  title: string;
  description?: string;
  location?: string;
  scheduled_at?: string;
  poll_id?: string;
  poll_option_id?: string;
}

interface ParticipationPayload {
  activity_id: string;
  status: 'accepted' | 'rejected';
  rejection_reason?: string;
}

interface LeaderboardPayload {
  activity_id: string;
  user_id: string;
  rank: number;
}

export const useActivityOperations = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createActivity = async (payload: ActivityPayload) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        'activity-operations',
        {
          body: {
            action: 'create_activity',
            payload,
          },
        }
      );

      if (functionError) throw functionError;
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create activity';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const participateInActivity = async (payload: ParticipationPayload) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        'activity-operations',
        {
          body: {
            action: 'participate_in_activity',
            payload,
          },
        }
      );

      if (functionError) throw functionError;
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update participation';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const markLeaderboard = async (payload: LeaderboardPayload) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        'activity-operations',
        {
          body: {
            action: 'mark_leaderboard',
            payload,
          },
        }
      );

      if (functionError) throw functionError;
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to mark leaderboard';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createActivity,
    participateInActivity,
    markLeaderboard,
    isLoading,
    error,
  };
};
