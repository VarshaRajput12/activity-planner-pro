-- Enable the pg_net extension for making HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a function to call the edge function on user creation
CREATE OR REPLACE FUNCTION public.call_handle_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_id bigint;
  edge_function_url text;
BEGIN
  -- Get the edge function URL from environment or use default
  edge_function_url := current_setting('app.settings.edge_function_url', true);
  
  IF edge_function_url IS NULL THEN
    edge_function_url := 'https://your-project-ref.supabase.co/functions/v1/handle-user-signup';
  END IF;

  -- Make async HTTP request to edge function
  SELECT net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'users',
      'record', to_jsonb(NEW),
      'schema', 'auth',
      'old_record', null
    )
  ) INTO request_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the transaction
    RAISE WARNING 'Failed to call edge function: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Note: The existing handle_new_user trigger already handles profile creation
-- This webhook trigger can be used as a backup or for additional processing
-- Uncomment the following lines if you want to use the edge function instead:

-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created_webhook
--     AFTER INSERT ON auth.users
--     FOR EACH ROW EXECUTE FUNCTION public.call_handle_user_signup();

-- Add helpful comment
COMMENT ON FUNCTION public.call_handle_user_signup() IS 'Calls the edge function to handle new user signup. Can be used as an alternative to the direct trigger.';
