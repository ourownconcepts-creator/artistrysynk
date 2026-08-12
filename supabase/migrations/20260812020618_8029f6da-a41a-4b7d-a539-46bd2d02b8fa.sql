ALTER TABLE public.contact_submissions ADD COLUMN IF NOT EXISTS user_id uuid;

CREATE INDEX IF NOT EXISTS idx_contact_submissions_user_id ON public.contact_submissions(user_id, created_at DESC);

GRANT SELECT ON public.contact_submissions TO authenticated;

DROP POLICY IF EXISTS "Users can view their own support requests" ON public.contact_submissions;
CREATE POLICY "Users can view their own support requests"
ON public.contact_submissions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());