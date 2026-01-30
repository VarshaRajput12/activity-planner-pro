-- Migration to update existing activities based on scheduled_at time

-- Mark upcoming activities as ongoing if their scheduled_at time has passed
UPDATE activities
SET status = 'ongoing'
WHERE status = 'upcoming'
AND scheduled_at IS NOT NULL
AND scheduled_at <= NOW();

COMMENT ON TABLE activities IS 'Activities table - auto-update logic revised on 2026-01-20';
