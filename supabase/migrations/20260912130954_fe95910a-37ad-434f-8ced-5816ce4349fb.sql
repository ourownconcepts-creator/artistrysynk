CREATE TABLE public.integration_completion_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.integration_clients(id) ON DELETE CASCADE,
  intent_id UUID REFERENCES public.integration_intents(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  external_subject TEXT NOT NULL,
  granted_scopes TEXT[] NOT NULL DEFAULT '{}',
  redirect_uri TEXT NOT NULL,
  code_hash TEXT NOT NULL UNIQUE,
  state TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','consumed','expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  consumed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT ALL ON public.integration_completion_codes TO service_role;

ALTER TABLE public.integration_completion_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No client access to completion codes"
  ON public.integration_completion_codes
  FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

CREATE INDEX integration_completion_codes_client_idx
  ON public.integration_completion_codes(client_id);
CREATE INDEX integration_completion_codes_intent_idx
  ON public.integration_completion_codes(intent_id);

CREATE TRIGGER integration_completion_codes_touch
  BEFORE UPDATE ON public.integration_completion_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();