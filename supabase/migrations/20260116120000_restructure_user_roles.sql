-- Migration: Restructure user roles system
-- Changes:
-- 1. Convert user_roles to a lookup table with just 2 roles: Admin and User
-- 2. Add role_id column to profiles table
-- 3. Drop admins table (no longer needed)
-- 4. Update all related functions and policies

-- Step 1: Create new roles lookup table structure
-- First, create a temporary table to store the new roles
CREATE TABLE IF NOT EXISTS public.roles_lookup (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Insert the two predefined roles
INSERT INTO public.roles_lookup (id, name) VALUES
    ('00000000-0000-0000-0000-000000000001', 'User'),
    ('00000000-0000-0000-0000-000000000002', 'Admin')
ON CONFLICT (name) DO NOTHING;

-- Step 2: Add role_id column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles_lookup(id) DEFAULT '00000000-0000-0000-0000-000000000001';

-- Step 3: Migrate existing data from user_roles to profiles
-- Update profiles with admin role based on existing user_roles
UPDATE public.profiles p
SET role_id = '00000000-0000-0000-0000-000000000002'
WHERE EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p.id AND ur.role = 'admin'
);

-- Update profiles with user role (default for those without admin)
UPDATE public.profiles p
SET role_id = '00000000-0000-0000-0000-000000000001'
WHERE role_id IS NULL;

-- Make role_id NOT NULL after data migration
ALTER TABLE public.profiles 
ALTER COLUMN role_id SET NOT NULL;

-- Step 4: Drop old user_roles table (backup data is now in profiles)
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- Step 5: Rename roles_lookup to user_roles for consistency
ALTER TABLE public.roles_lookup RENAME TO user_roles;

-- Step 6: Drop admins table (no longer needed)
DROP TABLE IF EXISTS public.admins CASCADE;

-- Step 7: Enable RLS on new user_roles table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS policies for user_roles (read-only for all authenticated users)
CREATE POLICY "User roles viewable by authenticated"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (true);

-- Only admins can modify roles (but this should generally be done manually)
CREATE POLICY "Only admins can modify roles"
    ON public.user_roles FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() 
            AND profiles.role_id = '00000000-0000-0000-0000-000000000002'
        )
    );

-- Step 9: Update is_admin function to check profiles.role_id
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = _user_id 
        AND role_id = '00000000-0000-0000-0000-000000000002'
    )
$$;

-- Step 10: Drop has_role function (no longer needed with new structure)
DROP FUNCTION IF EXISTS public.has_role(UUID, app_role) CASCADE;

-- Step 11: Create new function to check if user has specific role by name
CREATE OR REPLACE FUNCTION public.has_role_by_name(_user_id UUID, _role_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.user_roles r ON p.role_id = r.id
        WHERE p.id = _user_id AND r.name = _role_name
    )
$$;

-- Step 12: Create helper function to get user role name
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT r.name
    FROM public.profiles p
    JOIN public.user_roles r ON p.role_id = r.id
    WHERE p.id = _user_id
$$;

-- Step 13: Update handle_new_user function to assign default role_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create profile with default User role
    INSERT INTO public.profiles (id, email, full_name, avatar_url, role_id)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        NEW.raw_user_meta_data->>'avatar_url',
        '00000000-0000-0000-0000-000000000001' -- Default to User role
    );
    
    RETURN NEW;
END;
$$;

-- Step 14: Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role_id ON public.profiles(role_id);

-- Step 15: Add comment to explain the role IDs
COMMENT ON TABLE public.user_roles IS 'Lookup table for user roles. Contains exactly 2 entries: User (id: 00000000-0000-0000-0000-000000000001) and Admin (id: 00000000-0000-0000-0000-000000000002)';
COMMENT ON COLUMN public.profiles.role_id IS 'Foreign key to user_roles table. Determines if user is Admin or regular User';
