ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS reference_id text;

CREATE UNIQUE INDEX IF NOT EXISTS contact_submissions_reference_id_key
  ON public.contact_submissions (reference_id);

CREATE TABLE public.contact_submission_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id uuid REFERENCES public.contact_submissions(id) ON DELETE SET NULL,
  reference_id text,
  email text,
  ip_hash text,
  user_agent text,
  outcome text NOT NULL,
  reject_reason text,
  captcha_required boolean NOT NULL DEFAULT false,
  captcha_passed boolean,
  validation_results jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.contact_submission_audit TO authenticated;
GRANT ALL ON public.contact_submission_audit TO service_role;

ALTER TABLE public.contact_submission_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view contact audit log"
ON public.contact_submission_audit
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'master_admin')
  OR public.has_role(auth.uid(), 'super_admin')
);

CREATE INDEX IF NOT EXISTS contact_submission_audit_ip_hash_created_idx
  ON public.contact_submission_audit (ip_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS contact_submission_audit_email_created_idx
  ON public.contact_submission_audit (email, created_at DESC);

INSERT INTO public.admin_settings (setting_key, setting_value)
VALUES
  ('support_inbox_email', '"support@artistrysynk.app"'::jsonb),
  ('privacy_inbox_email', '"privacy@artistrysynk.app"'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;