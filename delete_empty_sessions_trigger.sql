-- Function to check and delete session if no logs remain
CREATE OR REPLACE FUNCTION public.check_and_delete_empty_session()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if there are any remaining logs for the session being affected
  -- We look for any row in workout_logs that has the same session_id as the deleted row (OLD.session_id)
  IF NOT EXISTS (
      SELECT 1 
      FROM workout_logs 
      WHERE session_id = OLD.session_id
  ) THEN
    -- If no logs exist, delete the session
    DELETE FROM workout_sessions WHERE id = OLD.session_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to fire after a log is deleted
DROP TRIGGER IF EXISTS delete_session_if_empty ON workout_logs;

CREATE TRIGGER delete_session_if_empty
AFTER DELETE ON workout_logs
FOR EACH ROW
EXECUTE PROCEDURE public.check_and_delete_empty_session();
