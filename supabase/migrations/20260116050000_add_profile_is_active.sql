-- Add is_active column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Backfill existing rows to active=true where null
UPDATE public.profiles SET is_active = true WHERE is_active IS NULL;
