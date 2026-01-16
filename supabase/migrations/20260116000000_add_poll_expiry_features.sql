-- Migration to add poll expiry features
-- 1. Allow users to update their votes (change vote)
-- 2. Add function to process expired polls and convert them to activities

-- Add UPDATE policy for votes so users can change their vote
CREATE POLICY "Users can update their own vote"
    ON public.votes FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- Function to get winning option from a poll
CREATE OR REPLACE FUNCTION public.get_winning_poll_option(poll_id_param UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    winning_option_id UUID;
BEGIN
    -- Get the option with the most votes
    SELECT po.id INTO winning_option_id
    FROM poll_options po
    LEFT JOIN votes v ON v.option_id = po.id
    WHERE po.poll_id = poll_id_param
    GROUP BY po.id
    ORDER BY COUNT(v.id) DESC, po.created_at ASC
    LIMIT 1;
    
    RETURN winning_option_id;
END;
$$;

-- Function to process expired polls and create activities
CREATE OR REPLACE FUNCTION public.process_expired_polls()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    expired_poll RECORD;
    winning_option_id UUID;
    winning_option RECORD;
    new_activity_id UUID;
BEGIN
    -- Find all active polls that have expired and haven't been converted to activities
    FOR expired_poll IN 
        SELECT ap.*
        FROM activity_polls ap
        WHERE ap.status = 'active'
        AND ap.expires_at < NOW()
        AND NOT EXISTS (
            SELECT 1 FROM activities a WHERE a.poll_id = ap.id
        )
    LOOP
        -- Get the winning option
        winning_option_id := get_winning_poll_option(expired_poll.id);
        
        -- Get winning option details
        SELECT * INTO winning_option
        FROM poll_options
        WHERE id = winning_option_id;
        
        -- Create activity from the poll
        INSERT INTO activities (
            title,
            description,
            status,
            created_by,
            poll_id,
            poll_option_id,
            created_at,
            updated_at
        )
        VALUES (
            expired_poll.title || ' - ' || winning_option.title,
            COALESCE(expired_poll.description || E'\n\n', '') || 
            'This activity was created from a poll. Winning option: ' || winning_option.title ||
            COALESCE(E'\n' || winning_option.description, ''),
            'upcoming',
            expired_poll.created_by,
            expired_poll.id,
            winning_option_id,
            NOW(),
            NOW()
        )
        RETURNING id INTO new_activity_id;
        
        -- Update poll status to resolved
        UPDATE activity_polls
        SET status = 'resolved', updated_at = NOW()
        WHERE id = expired_poll.id;
        
        -- Create participation entries for all voters
        INSERT INTO activity_participation (activity_id, user_id, status)
        SELECT DISTINCT new_activity_id, v.user_id, 'pending'
        FROM votes v
        WHERE v.poll_id = expired_poll.id;
        
        -- Create notifications for all voters
        INSERT INTO notifications (user_id, title, message, type, reference_id)
        SELECT DISTINCT 
            v.user_id,
            'Poll Completed: ' || expired_poll.title,
            'The poll has ended and a new activity has been created: ' || 
            expired_poll.title || ' - ' || winning_option.title,
            'poll_completed',
            new_activity_id
        FROM votes v
        WHERE v.poll_id = expired_poll.id;
        
    END LOOP;
END;
$$;

-- Create a pg_cron job to run the function periodically (every minute)
-- Note: This requires pg_cron extension to be enabled
-- For Supabase, you may need to enable this in the dashboard or use Edge Functions instead

-- Optional: Create a trigger-based approach using a scheduled job
-- This can be called manually or via an Edge Function on a schedule
COMMENT ON FUNCTION public.process_expired_polls() IS 
'Processes all expired polls and converts them to activities. Should be called periodically (e.g., every minute via cron or Edge Function).';
