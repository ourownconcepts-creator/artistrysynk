-- ============================================================
-- Phase 1: Legal document system + consent records
-- ============================================================

CREATE TABLE public.legal_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'policy',
  summary text,
  is_acceptance_required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.legal_documents TO anon;
GRANT SELECT ON public.legal_documents TO authenticated;
GRANT ALL ON public.legal_documents TO service_role;

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Legal documents are publicly readable"
  ON public.legal_documents FOR SELECT
  USING (true);

CREATE POLICY "Admins manage legal documents"
  ON public.legal_documents FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'master_admin')
    OR public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'master_admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE TRIGGER update_legal_documents_updated_at
  BEFORE UPDATE ON public.legal_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------

CREATE TABLE public.legal_document_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
  version integer NOT NULL,
  content text NOT NULL,
  change_note text,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'draft',
  requires_reacceptance boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT legal_document_versions_version_unique UNIQUE (document_id, version),
  CONSTRAINT legal_document_versions_status_check CHECK (status IN ('draft','published','archived')),
  CONSTRAINT legal_document_versions_version_positive CHECK (version > 0)
);

CREATE INDEX idx_legal_document_versions_document ON public.legal_document_versions(document_id, version DESC);
CREATE INDEX idx_legal_document_versions_published ON public.legal_document_versions(document_id, status) WHERE status = 'published';

GRANT SELECT ON public.legal_document_versions TO anon;
GRANT SELECT ON public.legal_document_versions TO authenticated;
GRANT ALL ON public.legal_document_versions TO service_role;

ALTER TABLE public.legal_document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published legal versions are publicly readable"
  ON public.legal_document_versions FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins read all legal versions"
  ON public.legal_document_versions FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'master_admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Admins create legal versions"
  ON public.legal_document_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'master_admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Admins update legal versions"
  ON public.legal_document_versions FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'master_admin')
    OR public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'master_admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE TRIGGER update_legal_document_versions_updated_at
  BEFORE UPDATE ON public.legal_document_versions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Published content is immutable: only status/publication metadata may change.
CREATE OR REPLACE FUNCTION public.protect_published_legal_versions()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'published' AND (
       NEW.content IS DISTINCT FROM OLD.content
    OR NEW.version IS DISTINCT FROM OLD.version
    OR NEW.document_id IS DISTINCT FROM OLD.document_id
    OR NEW.effective_date IS DISTINCT FROM OLD.effective_date
  ) THEN
    RAISE EXCEPTION 'Published legal versions are immutable. Publish a new version instead.';
  END IF;
  IF NEW.status = 'published' AND OLD.status <> 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_published_legal_versions
  BEFORE UPDATE ON public.legal_document_versions
  FOR EACH ROW EXECUTE FUNCTION public.protect_published_legal_versions();

-- ------------------------------------------------------------

CREATE TABLE public.user_consents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  consent_type text NOT NULL,
  document_slug text,
  document_version_id uuid REFERENCES public.legal_document_versions(id) ON DELETE SET NULL,
  document_version integer,
  granted boolean NOT NULL DEFAULT true,
  context text NOT NULL DEFAULT 'signup',
  app_version text,
  ip_hash text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_consents_type_check CHECK (
    consent_type IN ('legal_acceptance','marketing','age_confirmation','personalisation','ai_features')
  )
);

CREATE INDEX idx_user_consents_user ON public.user_consents(user_id, consent_type, created_at DESC);
CREATE INDEX idx_user_consents_slug ON public.user_consents(document_slug, created_at DESC);

GRANT SELECT, INSERT ON public.user_consents TO authenticated;
GRANT ALL ON public.user_consents TO service_role;

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own consents"
  ON public.user_consents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users record own consents"
  ON public.user_consents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read consent records"
  ON public.user_consents FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'master_admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- ------------------------------------------------------------
-- Helper: which mandatory documents still need acceptance by a user.
CREATE OR REPLACE FUNCTION public.get_pending_legal_acceptances(_user_id uuid)
RETURNS TABLE(slug text, title text, version integer, effective_date date, version_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH current_versions AS (
    SELECT d.slug,
           d.title,
           v.id AS version_id,
           v.version,
           v.effective_date,
           v.requires_reacceptance,
           ROW_NUMBER() OVER (PARTITION BY d.id ORDER BY v.version DESC) AS rn
    FROM public.legal_documents d
    JOIN public.legal_document_versions v ON v.document_id = d.id
    WHERE d.is_acceptance_required = true
      AND v.status = 'published'
  )
  SELECT cv.slug, cv.title, cv.version, cv.effective_date, cv.version_id
  FROM current_versions cv
  WHERE cv.rn = 1
    AND NOT EXISTS (
      SELECT 1 FROM public.user_consents c
      WHERE c.user_id = _user_id
        AND c.consent_type = 'legal_acceptance'
        AND c.document_slug = cv.slug
        AND c.granted = true
        AND c.document_version >= cv.version
    );
$$;

REVOKE ALL ON FUNCTION public.get_pending_legal_acceptances(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pending_legal_acceptances(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_legal_acceptances(uuid) TO service_role;

-- ------------------------------------------------------------
-- Seed the document catalogue (content is added as version 1 next).
INSERT INTO public.legal_documents (slug, title, category, summary, is_acceptance_required, sort_order) VALUES
  ('terms', 'Terms of Service', 'agreement', 'The agreement between you and ArtistrySynk.', true, 1),
  ('privacy', 'Privacy Policy', 'privacy', 'What information we collect, why, and your choices.', true, 2),
  ('community-guidelines', 'Community Guidelines', 'safety', 'How to behave on ArtistrySynk.', true, 3),
  ('acceptable-use', 'Acceptable Use Policy', 'safety', 'What you may and may not do with the platform.', false, 4),
  ('copyright', 'Copyright & Intellectual Property Policy', 'copyright', 'You own your work. How to report infringement.', false, 5),
  ('moderation', 'Content Moderation & Reporting Policy', 'safety', 'How reports are reviewed and decisions appealed.', false, 6),
  ('account-deletion', 'Account Deletion Policy', 'privacy', 'How deletion works and what is retained.', false, 7),
  ('cookies', 'Cookie Policy', 'privacy', 'Cookies and similar technologies we use.', false, 8),
  ('subscriptions', 'Subscription & Refund Policy', 'commerce', 'Billing, renewals and refunds for paid plans.', false, 9),
  ('data-protection', 'Data Protection & Privacy Rights Notice', 'privacy', 'Your data protection rights and how to exercise them.', false, 10);