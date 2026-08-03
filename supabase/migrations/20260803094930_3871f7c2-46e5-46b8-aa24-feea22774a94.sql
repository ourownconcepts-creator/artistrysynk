ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS admin_response text,
  ADD COLUMN IF NOT EXISTS responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS responded_by uuid,
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'support';

CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON public.contact_submissions (status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at ON public.contact_submissions (created_at DESC);