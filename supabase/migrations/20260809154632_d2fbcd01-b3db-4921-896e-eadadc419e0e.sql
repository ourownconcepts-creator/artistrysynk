-- ============================================================
-- Privacy, Safety & Compliance foundation
-- ============================================================

-- ---------- Phase 2: privacy controls -----------------------
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS discoverable_in_discovery boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS discoverable_in_search boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS discoverable_in_recommendations boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS location_precision text NOT NULL DEFAULT 'city',
  ADD COLUMN IF NOT EXISTS personalisation_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_features_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.user_settings
  DROP CONSTRAINT IF EXISTS user_settings_location_precision_check;
ALTER TABLE public.user_settings
  ADD CONSTRAINT user_settings_location_precision_check
  CHECK (location_precision IN ('off','city','precise'));

-- ---------- Phase 2: asynchronous data exports --------------
CREATE TABLE public.data_export_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  storage_path text,
  file_size integer,
  download_token text,
  expires_at timestamptz,
  download_count integer NOT NULL DEFAULT 0,
  error_message text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT data_export_requests_status_check
    CHECK (status IN ('queued','processing','ready','expired','failed'))
);

CREATE INDEX idx_data_export_requests_user ON public.data_export_requests(user_id, requested_at DESC);
CREATE UNIQUE INDEX idx_data_export_requests_token
  ON public.data_export_requests(download_token) WHERE download_token IS NOT NULL;

GRANT SELECT, INSERT ON public.data_export_requests TO authenticated;
GRANT ALL ON public.data_export_requests TO service_role;
ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own export requests"
  ON public.data_export_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users create own export requests"
  ON public.data_export_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_data_export_requests_updated_at
  BEFORE UPDATE ON public.data_export_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- Phase 3: report severity ------------------------
ALTER TABLE public.content_flags
  ADD COLUMN IF NOT EXISTS risk_level text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS evidence_urls text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.content_flags DROP CONSTRAINT IF EXISTS content_flags_risk_level_check;
ALTER TABLE public.content_flags
  ADD CONSTRAINT content_flags_risk_level_check
  CHECK (risk_level IN ('standard','elevated','high','urgent'));

-- ---------- Phase 3: copyright claims -----------------------
CREATE TABLE public.copyright_claims (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_id text NOT NULL UNIQUE,
  claimant_user_id uuid,
  rights_holder_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  work_description text NOT NULL,
  content_type text NOT NULL,
  content_id text,
  content_url text NOT NULL,
  infringement_explanation text NOT NULL,
  evidence_urls text[] NOT NULL DEFAULT '{}',
  declaration_accepted boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'submitted',
  reviewed_by uuid,
  reviewed_at timestamptz,
  admin_notes text,
  outcome text,
  respondent_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT copyright_claims_status_check
    CHECK (status IN ('submitted','under_review','more_info_required','action_taken','rejected','appealed')),
  CONSTRAINT copyright_claims_declaration_required CHECK (declaration_accepted = true)
);

CREATE INDEX idx_copyright_claims_status ON public.copyright_claims(status, created_at DESC);
CREATE INDEX idx_copyright_claims_respondent ON public.copyright_claims(respondent_user_id);

GRANT SELECT, INSERT ON public.copyright_claims TO authenticated;
GRANT ALL ON public.copyright_claims TO service_role;
ALTER TABLE public.copyright_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Claimants read own copyright claims"
  ON public.copyright_claims FOR SELECT TO authenticated
  USING (auth.uid() = claimant_user_id);
CREATE POLICY "Signed-in users submit copyright claims"
  ON public.copyright_claims FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = claimant_user_id);
CREATE POLICY "Admins manage copyright claims"
  ON public.copyright_claims FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master_admin')
    OR public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master_admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE TRIGGER update_copyright_claims_updated_at
  BEFORE UPDATE ON public.copyright_claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- Phase 4: privacy requests -----------------------
CREATE TABLE public.privacy_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_id text NOT NULL UNIQUE,
  user_id uuid,
  contact_email text NOT NULL,
  request_type text NOT NULL,
  details text,
  verification_status text NOT NULL DEFAULT 'session_verified',
  status text NOT NULL DEFAULT 'received',
  assigned_to uuid,
  response_due_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  resolution_notes text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT privacy_requests_type_check
    CHECK (request_type IN ('access','correction','deletion','export','restriction','objection','other')),
  CONSTRAINT privacy_requests_status_check
    CHECK (status IN ('received','verifying','in_progress','completed','rejected','withdrawn')),
  CONSTRAINT privacy_requests_verification_check
    CHECK (verification_status IN ('pending','session_verified','email_verified','failed'))
);

CREATE INDEX idx_privacy_requests_status ON public.privacy_requests(status, response_due_at);
CREATE INDEX idx_privacy_requests_user ON public.privacy_requests(user_id, created_at DESC);

GRANT SELECT, INSERT ON public.privacy_requests TO authenticated;
GRANT ALL ON public.privacy_requests TO service_role;
ALTER TABLE public.privacy_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own privacy requests"
  ON public.privacy_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users create own privacy requests"
  ON public.privacy_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_privacy_requests_updated_at
  BEFORE UPDATE ON public.privacy_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- Phase 4: security incidents ---------------------
CREATE TABLE public.security_incidents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_id text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  discovered_at timestamptz NOT NULL DEFAULT now(),
  occurred_at timestamptz,
  systems_affected text[] NOT NULL DEFAULT '{}',
  data_categories_affected text[] NOT NULL DEFAULT '{}',
  affected_user_estimate integer,
  severity text NOT NULL DEFAULT 'low',
  containment_status text NOT NULL DEFAULT 'investigating',
  investigation_notes text,
  users_notified boolean NOT NULL DEFAULT false,
  users_notified_at timestamptz,
  regulator_notified boolean NOT NULL DEFAULT false,
  regulator_notified_at timestamptz,
  resolution text,
  lessons_learned text,
  status text NOT NULL DEFAULT 'open',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT security_incidents_severity_check CHECK (severity IN ('low','medium','high','critical')),
  CONSTRAINT security_incidents_containment_check
    CHECK (containment_status IN ('investigating','contained','eradicated','recovered')),
  CONSTRAINT security_incidents_status_check CHECK (status IN ('open','monitoring','closed'))
);

GRANT SELECT, INSERT, UPDATE ON public.security_incidents TO authenticated;
GRANT ALL ON public.security_incidents TO service_role;
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage security incidents"
  ON public.security_incidents FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master_admin')
    OR public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master_admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE TRIGGER update_security_incidents_updated_at
  BEFORE UPDATE ON public.security_incidents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.security_incident_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id uuid NOT NULL REFERENCES public.security_incidents(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL,
  event_type text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_security_incident_events_incident
  ON public.security_incident_events(incident_id, created_at);

GRANT SELECT, INSERT ON public.security_incident_events TO authenticated;
GRANT ALL ON public.security_incident_events TO service_role;
ALTER TABLE public.security_incident_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read incident timeline"
  ON public.security_incident_events FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master_admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );
CREATE POLICY "Admins append incident timeline"
  ON public.security_incident_events FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = actor_id AND (
      public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master_admin')
      OR public.has_role(auth.uid(), 'super_admin')
    )
  );

-- ---------- Phase 4: registers ------------------------------
CREATE TABLE public.data_processors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL,
  service text NOT NULL,
  data_accessed text NOT NULL,
  purpose text NOT NULL,
  processing_location text,
  contract_status text NOT NULL DEFAULT 'unknown',
  security_documentation text,
  retention text,
  transfer_mechanism text,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT data_processors_contract_check
    CHECK (contract_status IN ('unknown','dpa_in_place','terms_only','pending_review'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_processors TO authenticated;
GRANT ALL ON public.data_processors TO service_role;
ALTER TABLE public.data_processors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage processor register"
  ON public.data_processors FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master_admin')
    OR public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master_admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE TRIGGER update_data_processors_updated_at
  BEFORE UPDATE ON public.data_processors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.retention_policies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL UNIQUE,
  description text NOT NULL,
  retention_rule text NOT NULL,
  retention_days integer,
  justification text NOT NULL,
  deletion_behaviour text NOT NULL,
  is_automated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.retention_policies TO authenticated;
GRANT ALL ON public.retention_policies TO service_role;
ALTER TABLE public.retention_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage retention policies"
  ON public.retention_policies FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master_admin')
    OR public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master_admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE TRIGGER update_retention_policies_updated_at
  BEFORE UPDATE ON public.retention_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.data_inventory (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name text NOT NULL,
  field_name text NOT NULL,
  data_category text NOT NULL,
  purpose text NOT NULL,
  lawful_basis text NOT NULL,
  is_required boolean NOT NULL DEFAULT false,
  visibility text NOT NULL,
  storage_location text NOT NULL DEFAULT 'Lovable Cloud database',
  third_parties text,
  retention text NOT NULL,
  deletion_behaviour text NOT NULL,
  security_classification text NOT NULL DEFAULT 'confidential',
  user_visible_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT data_inventory_field_unique UNIQUE (table_name, field_name),
  CONSTRAINT data_inventory_visibility_check
    CHECK (visibility IN ('public','members','connections','private','internal')),
  CONSTRAINT data_inventory_classification_check
    CHECK (security_classification IN ('public','internal','confidential','restricted'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_inventory TO authenticated;
GRANT ALL ON public.data_inventory TO service_role;
ALTER TABLE public.data_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage data inventory"
  ON public.data_inventory FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master_admin')
    OR public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master_admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE TRIGGER update_data_inventory_updated_at
  BEFORE UPDATE ON public.data_inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.compliance_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  record_type text NOT NULL,
  title text NOT NULL,
  activity text,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  owner text,
  status text NOT NULL DEFAULT 'draft',
  review_due date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT compliance_records_type_check CHECK (record_type IN ('ropa','dpia','assessment','note')),
  CONSTRAINT compliance_records_status_check
    CHECK (status IN ('draft','in_review','approved','requires_legal_review','superseded'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.compliance_records TO authenticated;
GRANT ALL ON public.compliance_records TO service_role;
ALTER TABLE public.compliance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage compliance records"
  ON public.compliance_records FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master_admin')
    OR public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master_admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE TRIGGER update_compliance_records_updated_at
  BEFORE UPDATE ON public.compliance_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- Phase 5: admin audit log (append-only) ----------
CREATE TABLE public.admin_audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id uuid NOT NULL,
  actor_role text,
  action text NOT NULL,
  target_type text,
  target_id text,
  target_label text,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_audit_logs_actor ON public.admin_audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_admin_audit_logs_action ON public.admin_audit_logs(action, created_at DESC);
CREATE INDEX idx_admin_audit_logs_target ON public.admin_audit_logs(target_type, target_id);

GRANT SELECT ON public.admin_audit_logs TO authenticated;
GRANT ALL ON public.admin_audit_logs TO service_role;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Read-only for admins; writes happen server-side with the service role.
CREATE POLICY "Admins read audit log"
  ON public.admin_audit_logs FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master_admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE OR REPLACE FUNCTION public.block_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Audit log entries are append-only.';
END;
$$;

CREATE TRIGGER admin_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON public.admin_audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.block_audit_log_mutation();

CREATE TRIGGER security_incident_events_immutable
  BEFORE UPDATE OR DELETE ON public.security_incident_events
  FOR EACH ROW EXECUTE FUNCTION public.block_audit_log_mutation();

-- ---------- Phase 5: granular admin roles -------------------
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'compliance_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'trust_safety_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support_agent';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'finance_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'technical_admin';