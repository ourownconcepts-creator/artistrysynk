CREATE TABLE public.account_deletion_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  confirmation_token text NOT NULL,
  status text NOT NULL DEFAULT 'pending_confirmation',
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  confirmed_at timestamp with time zone,
  scheduled_for timestamp with time zone,
  cancelled_at timestamp with time zone,
  completed_at timestamp with time zone
);

CREATE UNIQUE INDEX account_deletion_requests_active_user_idx
  ON public.account_deletion_requests (user_id)
  WHERE status IN ('pending_confirmation', 'scheduled');

CREATE UNIQUE INDEX account_deletion_requests_token_idx
  ON public.account_deletion_requests (confirmation_token);

GRANT SELECT ON public.account_deletion_requests TO authenticated;
GRANT ALL ON public.account_deletion_requests TO service_role;

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own deletion requests"
  ON public.account_deletion_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);