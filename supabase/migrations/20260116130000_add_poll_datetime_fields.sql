-- Add date and time fields to activity_polls table
-- This allows users to specify when the poll event is scheduled for

ALTER TABLE public.activity_polls
ADD COLUMN event_date DATE,
ADD COLUMN event_time TIME;

-- Add a comment to explain the new columns
COMMENT ON COLUMN public.activity_polls.event_date IS 'The date when the poll event is scheduled';
COMMENT ON COLUMN public.activity_polls.event_time IS 'The time when the poll event is scheduled';
