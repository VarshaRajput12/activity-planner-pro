
-- Fix function search_path for update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Drop and recreate notification insert policy with proper check
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

CREATE POLICY "Admins can insert notifications"
    ON public.notifications FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin(auth.uid()));
