
-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create enum for participation status
CREATE TYPE public.participation_status AS ENUM ('pending', 'accepted', 'rejected');

-- Create enum for poll status
CREATE TYPE public.poll_status AS ENUM ('active', 'closed', 'resolved');

-- Create enum for activity status
CREATE TYPE public.activity_status AS ENUM ('upcoming', 'ongoing', 'completed', 'cancelled');

-- Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Admins table (stores admin emails)
CREATE TABLE public.admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    added_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- User roles table (proper role management)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (user_id, role)
);

-- Activity polls table
CREATE TABLE public.activity_polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status poll_status DEFAULT 'active' NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Poll options table
CREATE TABLE public.poll_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID REFERENCES public.activity_polls(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Votes table
CREATE TABLE public.votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID REFERENCES public.activity_polls(id) ON DELETE CASCADE NOT NULL,
    option_id UUID REFERENCES public.poll_options(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (poll_id, user_id)
);

-- Activities table
CREATE TABLE public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    status activity_status DEFAULT 'upcoming' NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    poll_id UUID REFERENCES public.activity_polls(id) ON DELETE SET NULL,
    poll_option_id UUID REFERENCES public.poll_options(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Activity participation table
CREATE TABLE public.activity_participation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status participation_status DEFAULT 'pending' NOT NULL,
    rejection_reason TEXT,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (activity_id, user_id)
);

-- Leaderboard entries table
CREATE TABLE public.leaderboard_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    rank INTEGER CHECK (rank >= 1 AND rank <= 3),
    marked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (activity_id, user_id)
);

-- Notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    reference_id UUID,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_participation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admins a
        JOIN public.profiles p ON p.email = a.email
        WHERE p.id = _user_id
    )
$$;

-- Security definer function to check role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    )
$$;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    
    -- Assign default user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    -- If email exists in admins table, also assign admin role
    IF EXISTS (SELECT 1 FROM public.admins WHERE email = NEW.email) THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_activity_polls_updated_at
    BEFORE UPDATE ON public.activity_polls
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_activities_updated_at
    BEFORE UPDATE ON public.activities
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- RLS Policies for admins
CREATE POLICY "Admins table viewable by all authenticated"
    ON public.admins FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only admins can insert admins"
    ON public.admins FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete admins"
    ON public.admins FOR DELETE
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- RLS Policies for user_roles
CREATE POLICY "User roles viewable by authenticated"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only admins can modify roles"
    ON public.user_roles FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update roles"
    ON public.user_roles FOR UPDATE
    TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete roles"
    ON public.user_roles FOR DELETE
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- RLS Policies for activity_polls
CREATE POLICY "Polls viewable by authenticated"
    ON public.activity_polls FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can create polls"
    ON public.activity_polls FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Only admins or creators can update polls"
    ON public.activity_polls FOR UPDATE
    TO authenticated
    USING (public.is_admin(auth.uid()) OR auth.uid() = created_by);

CREATE POLICY "Only admins can delete polls"
    ON public.activity_polls FOR DELETE
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- RLS Policies for poll_options
CREATE POLICY "Poll options viewable by authenticated"
    ON public.poll_options FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Poll creators can add options"
    ON public.poll_options FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.activity_polls
            WHERE id = poll_id AND created_by = auth.uid()
        )
        OR public.is_admin(auth.uid())
    );

CREATE POLICY "Only admins or poll creators can update options"
    ON public.poll_options FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.activity_polls
            WHERE id = poll_id AND created_by = auth.uid()
        )
        OR public.is_admin(auth.uid())
    );

CREATE POLICY "Only admins can delete options"
    ON public.poll_options FOR DELETE
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- RLS Policies for votes
CREATE POLICY "Votes viewable by authenticated"
    ON public.votes FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can cast their own vote"
    ON public.votes FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vote"
    ON public.votes FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- RLS Policies for activities
CREATE POLICY "Activities viewable by authenticated"
    ON public.activities FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only admins can create activities"
    ON public.activities FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update activities"
    ON public.activities FOR UPDATE
    TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete activities"
    ON public.activities FOR DELETE
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- RLS Policies for activity_participation
CREATE POLICY "Participation viewable by authenticated"
    ON public.activity_participation FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can add own participation"
    ON public.activity_participation FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own participation"
    ON public.activity_participation FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- RLS Policies for leaderboard_entries
CREATE POLICY "Leaderboard viewable by authenticated"
    ON public.leaderboard_entries FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only admins can manage leaderboard"
    ON public.leaderboard_entries FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update leaderboard"
    ON public.leaderboard_entries FOR UPDATE
    TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete leaderboard entries"
    ON public.leaderboard_entries FOR DELETE
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
    ON public.notifications FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
    ON public.notifications FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_options;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_participation;

-- Create indexes for performance
CREATE INDEX idx_votes_poll_id ON public.votes(poll_id);
CREATE INDEX idx_votes_option_id ON public.votes(option_id);
CREATE INDEX idx_poll_options_poll_id ON public.poll_options(poll_id);
CREATE INDEX idx_activity_participation_activity ON public.activity_participation(activity_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_activities_status ON public.activities(status);
CREATE INDEX idx_activity_polls_status ON public.activity_polls(status);
