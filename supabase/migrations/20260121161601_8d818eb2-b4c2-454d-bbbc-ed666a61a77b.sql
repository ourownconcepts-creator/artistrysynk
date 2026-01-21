-- Create blocked_users table for user blocking feature
CREATE TABLE public.blocked_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

-- Enable RLS
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- Users can block others
CREATE POLICY "Users can create blocks"
ON public.blocked_users
FOR INSERT
WITH CHECK (auth.uid() = blocker_id);

-- Users can view their blocks
CREATE POLICY "Users can view their blocks"
ON public.blocked_users
FOR SELECT
USING (auth.uid() = blocker_id);

-- Users can unblock
CREATE POLICY "Users can delete their blocks"
ON public.blocked_users
FOR DELETE
USING (auth.uid() = blocker_id);

-- Create user_settings table for preferences
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  match_notifications BOOLEAN DEFAULT true,
  message_notifications BOOLEAN DEFAULT true,
  project_notifications BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT false,
  profile_visibility TEXT DEFAULT 'public' CHECK (profile_visibility IN ('public', 'matches_only', 'private')),
  show_online_status BOOLEAN DEFAULT true,
  allow_messages_from TEXT DEFAULT 'everyone' CHECK (allow_messages_from IN ('everyone', 'matches_only', 'nobody')),
  onboarding_completed BOOLEAN DEFAULT false,
  theme_preference TEXT DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Users can manage their own settings
CREATE POLICY "Users can manage their settings"
ON public.user_settings
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();