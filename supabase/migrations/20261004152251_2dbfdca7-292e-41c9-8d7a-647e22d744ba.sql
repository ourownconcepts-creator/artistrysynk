-- Campaign-level state on the existing campaign table
ALTER TABLE public.scheduled_newsletters
  ADD COLUMN IF NOT EXISTS campaign_name text,
  ADD COLUMN IF NOT EXISTS total_eligible integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_queued integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_sent integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_failed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_bounced integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_skipped integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_unsubscribed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_invalid integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_batch integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provider_limit integer,
  ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_provider_response jsonb,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS paused_reason text,
  ADD COLUMN IF NOT EXISTS locked_until timestamptz,
  ADD COLUMN IF NOT EXISTS recipients_prepared boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS scheduled_newsletters_idempotency_key_key
  ON public.scheduled_newsletters (idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.scheduled_newsletters DROP CONSTRAINT IF EXISTS scheduled_newsletters_status_check;
ALTER TABLE public.scheduled_newsletters ADD CONSTRAINT scheduled_newsletters_status_check
  CHECK (status = ANY (ARRAY['pending','processing','paused','sent','cancelled','failed','draft']));

-- Per-recipient persistent queue
CREATE TABLE IF NOT EXISTS public.newsletter_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.scheduled_newsletters(id) ON DELETE CASCADE,
  user_id uuid,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','sent','failed','bounced','unsubscribed','skipped','invalid','rate_limited')),
  provider_message_id text,
  attempts integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  next_attempt_at timestamptz,
  error_code text,
  error_message text,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, email)
);
CREATE INDEX IF NOT EXISTS idx_newsletter_recipients_queue ON public.newsletter_recipients (campaign_id, status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_newsletter_recipients_accepted ON public.newsletter_recipients (accepted_at) WHERE accepted_at IS NOT NULL;

GRANT SELECT ON public.newsletter_recipients TO authenticated;
GRANT ALL ON public.newsletter_recipients TO service_role;
ALTER TABLE public.newsletter_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view newsletter recipients" ON public.newsletter_recipients
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'master_admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER update_newsletter_recipients_updated_at BEFORE UPDATE ON public.newsletter_recipients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Configurable marketing limit (not hard-coded in the sender) + shared pause state
INSERT INTO public.admin_settings (setting_key, setting_value)
VALUES ('marketing_email_limits', '{"daily_limit": 60, "window_hours": 24}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;
INSERT INTO public.admin_settings (setting_key, setting_value)
VALUES ('marketing_send_state', jsonb_build_object('paused_until', (now() + interval '3 hours'), 'reason', 'daily_limit_reached'))
ON CONFLICT (setting_key) DO NOTHING;

-- Known hard bounce
INSERT INTO public.suppressed_emails (email, reason, metadata)
VALUES ('df_test_1787461715@mail.tm', 'bounce', '{"source":"queensmtp hard bounce"}'::jsonb)
ON CONFLICT (email) DO NOTHING;

-- Stop the two in-flight campaigns from hammering the provider.
-- "What's new" already reached ~53 people whose identities were not recorded, so it waits for an admin decision.
UPDATE public.scheduled_newsletters
SET status = 'paused', paused_reason = 'manual_review', next_attempt_at = NULL,
    last_error = 'Paused: this campaign was partly delivered before per-recipient tracking existed. Resume only if duplicates are acceptable.'
WHERE id = '219df5af-0e53-44e8-8da3-5821a2974cfe';
UPDATE public.scheduled_newsletters
SET status = 'paused', paused_reason = 'rate_limit', next_attempt_at = now() + interval '3 hours',
    last_error = 'Warm-up limit reached. Campaign paused. Sending will resume automatically.'
WHERE id = '92f0b0b2-366b-4ab3-91d2-9204fa7108bc';