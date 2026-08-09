ALTER TABLE public.copyright_claims
  ADD COLUMN IF NOT EXISTS submitter_ip_hash text;

CREATE INDEX IF NOT EXISTS idx_copyright_claims_ip_hash_created
  ON public.copyright_claims (submitter_ip_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_copyright_claims_reference
  ON public.copyright_claims (reference_id);