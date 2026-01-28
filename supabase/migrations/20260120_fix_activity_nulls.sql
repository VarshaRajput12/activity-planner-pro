-- Migration to backfill NULL description and scheduled_at for activities created from polls
-- This handles activities that were created without proper description and timing data

-- Update activities with NULL description to use poll description + option details
UPDATE activities a
SET description = CASE 
  WHEN ap.description IS NOT NULL THEN
    ap.description
  ELSE
    'Activity created from poll: ' || ap.title
END
FROM activity_polls ap
WHERE a.poll_id = ap.id
AND a.description IS NULL;

-- Update activities with NULL scheduled_at to use poll's event_date and event_time
UPDATE activities a
SET scheduled_at = ap.event_date::timestamp + COALESCE(ap.event_time, time '00:00')
FROM activity_polls ap
WHERE a.poll_id = ap.id
AND a.scheduled_at IS NULL
AND ap.event_date IS NOT NULL;

-- For activities with NULL description and no poll data, set a default
UPDATE activities
SET description = 'Activity: ' || title
WHERE description IS NULL
AND poll_id IS NULL;

-- Log migration completion
COMMENT ON TABLE activities IS 'Activities table - nulls have been backfilled on 2026-01-20';
