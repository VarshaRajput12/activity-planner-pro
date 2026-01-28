-- Function to update activity status based on scheduled_at date and time
CREATE OR REPLACE FUNCTION update_activity_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If activity is upcoming and scheduled_at time has been hit, mark as ongoing
  IF NEW.status = 'upcoming' AND NEW.scheduled_at IS NOT NULL THEN
    IF NEW.scheduled_at <= NOW() THEN
      NEW.status = 'ongoing';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and recreate it
DROP TRIGGER IF EXISTS activity_status_update_trigger ON activities;

CREATE TRIGGER activity_status_update_trigger
BEFORE INSERT OR UPDATE ON activities
FOR EACH ROW
EXECUTE FUNCTION update_activity_status();

-- Create a function to update statuses for all activities when called
CREATE OR REPLACE FUNCTION update_all_activity_statuses()
RETURNS void AS $$
BEGIN
  UPDATE activities
  SET status = 'ongoing'
  WHERE status = 'upcoming'
    AND scheduled_at IS NOT NULL
    AND DATE(scheduled_at) <= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;
