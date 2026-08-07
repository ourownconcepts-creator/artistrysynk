ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS notify_email_likes boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_inapp_likes boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_discovery boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_inapp_discovery boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_matches boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_inapp_matches boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_messages boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_inapp_messages boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_online boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_inapp_online boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_projects boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_inapp_projects boolean NOT NULL DEFAULT true;