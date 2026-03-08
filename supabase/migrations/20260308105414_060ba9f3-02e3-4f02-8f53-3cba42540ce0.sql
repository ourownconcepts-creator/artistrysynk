-- Add force_password_change column to user_settings
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS force_password_change boolean DEFAULT false;

-- Set force_password_change to true for all existing users (they'll need to change on next login)
UPDATE public.user_settings SET force_password_change = true;

-- For users without settings, create their settings with force_password_change = true
INSERT INTO public.user_settings (user_id, force_password_change)
SELECT p.id, true
FROM public.profiles p
LEFT JOIN public.user_settings us ON p.id = us.user_id
WHERE us.id IS NULL
ON CONFLICT (user_id) DO UPDATE SET force_password_change = true;