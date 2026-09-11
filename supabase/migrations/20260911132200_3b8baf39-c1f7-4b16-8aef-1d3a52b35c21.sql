CREATE TABLE public.integration_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'active', 'revoked')),
  operational_contact text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.integration_applications TO service_role;
ALTER TABLE public.integration_applications ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.integration_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.integration_applications(id) ON DELETE CASCADE,
  client_id text NOT NULL UNIQUE,
  client_secret_hash text,
  environment text NOT NULL CHECK (environment IN ('development', 'staging', 'production')),
  allowed_scopes text[] NOT NULL DEFAULT '{}',
  oauth_client_id text,
  status text NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'active', 'revoked')),
  secret_expires_at timestamptz,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, environment)
);
GRANT ALL ON public.integration_clients TO service_role;
ALTER TABLE public.integration_clients ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.integration_redirect_uris (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.integration_clients(id) ON DELETE CASCADE,
  environment text NOT NULL CHECK (environment IN ('development', 'staging', 'production')),
  redirect_uri text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, redirect_uri)
);
GRANT ALL ON public.integration_redirect_uris TO service_role;
ALTER TABLE public.integration_redirect_uris ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.integration_identity_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.integration_clients(id) ON DELETE CASCADE,
  external_subject text NOT NULL,
  user_id uuid NOT NULL,
  granted_scopes text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  linked_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, external_subject),
  UNIQUE (client_id, user_id)
);
GRANT ALL ON public.integration_identity_links TO service_role;
ALTER TABLE public.integration_identity_links ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.integration_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.integration_clients(id) ON DELETE CASCADE,
  intent_type text NOT NULL CHECK (intent_type IN ('identity_create', 'identity_link')),
  external_subject text NOT NULL,
  email_hash text,
  redirect_uri text NOT NULL,
  requested_scopes text[] NOT NULL DEFAULT '{}',
  code_hash text NOT NULL UNIQUE,
  idempotency_key_hash text,
  user_id uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'revoked')),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, idempotency_key_hash)
);
GRANT ALL ON public.integration_intents TO service_role;
ALTER TABLE public.integration_intents ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.integration_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.integration_clients(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  window_started_at timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 1 CHECK (request_count > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, endpoint, window_started_at)
);
GRANT ALL ON public.integration_rate_limits TO service_role;
ALTER TABLE public.integration_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.integration_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.integration_clients(id) ON DELETE SET NULL,
  application_id uuid REFERENCES public.integration_applications(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('success', 'failure')),
  subject_user_id uuid,
  external_subject_hash text,
  request_id text NOT NULL,
  ip_hash text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.integration_audit_events TO service_role;
ALTER TABLE public.integration_audit_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX integration_clients_status_idx ON public.integration_clients(status, environment);
CREATE INDEX integration_links_user_idx ON public.integration_identity_links(user_id, status);
CREATE INDEX integration_intents_expiry_idx ON public.integration_intents(status, expires_at);
CREATE INDEX integration_audit_client_time_idx ON public.integration_audit_events(client_id, created_at DESC);
CREATE INDEX integration_audit_request_idx ON public.integration_audit_events(request_id);

CREATE OR REPLACE FUNCTION public.validate_integration_record()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'integration_clients' THEN
    IF NEW.secret_expires_at IS NOT NULL AND NEW.secret_expires_at <= now() THEN
      RAISE EXCEPTION 'Client secret expiry must be in the future';
    END IF;
    IF EXISTS (
      SELECT 1 FROM unnest(NEW.allowed_scopes) AS scope
      WHERE scope NOT IN ('identity:create', 'identity:read', 'identity:link', 'profile:read')
    ) THEN
      RAISE EXCEPTION 'Unsupported integration scope';
    END IF;
  ELSIF TG_TABLE_NAME = 'integration_redirect_uris' THEN
    IF NEW.redirect_uri !~ '^https://[^[:space:]#]+$'
       AND NOT (NEW.environment = 'development' AND NEW.redirect_uri ~ '^http://(localhost|127\.0\.0\.1)(:[0-9]+)?(/[^#[:space:]]*)?$') THEN
      RAISE EXCEPTION 'Redirect URI must use HTTPS, except loopback development callbacks';
    END IF;
    IF position('#' in NEW.redirect_uri) > 0 THEN
      RAISE EXCEPTION 'Redirect URI fragments are not allowed';
    END IF;
  ELSIF TG_TABLE_NAME = 'integration_intents' THEN
    IF NEW.expires_at <= now() THEN
      RAISE EXCEPTION 'Integration intent expiry must be in the future';
    END IF;
    IF EXISTS (
      SELECT 1 FROM unnest(NEW.requested_scopes) AS scope
      WHERE scope NOT IN ('identity:create', 'identity:read', 'identity:link', 'profile:read')
    ) THEN
      RAISE EXCEPTION 'Unsupported integration scope';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.validate_integration_record() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_integration_record() TO service_role;

CREATE TRIGGER validate_integration_clients
BEFORE INSERT OR UPDATE ON public.integration_clients
FOR EACH ROW EXECUTE FUNCTION public.validate_integration_record();
CREATE TRIGGER validate_integration_redirect_uris
BEFORE INSERT OR UPDATE ON public.integration_redirect_uris
FOR EACH ROW EXECUTE FUNCTION public.validate_integration_record();
CREATE TRIGGER validate_integration_intents
BEFORE INSERT OR UPDATE ON public.integration_intents
FOR EACH ROW EXECUTE FUNCTION public.validate_integration_record();

CREATE TRIGGER integration_applications_updated_at
BEFORE UPDATE ON public.integration_applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER integration_clients_updated_at
BEFORE UPDATE ON public.integration_clients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER integration_redirect_uris_updated_at
BEFORE UPDATE ON public.integration_redirect_uris
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER integration_links_updated_at
BEFORE UPDATE ON public.integration_identity_links
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER integration_intents_updated_at
BEFORE UPDATE ON public.integration_intents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER integration_audit_events_immutable
BEFORE UPDATE OR DELETE ON public.integration_audit_events
FOR EACH ROW EXECUTE FUNCTION public.block_audit_log_mutation();

INSERT INTO public.integration_applications (name, slug, status)
VALUES ('Zik''s Got Talent', 'ziks-got-talent', 'inactive');

INSERT INTO public.integration_clients (
  application_id, client_id, environment, allowed_scopes, status
)
SELECT id, 'zgt-production-pending', 'production',
  ARRAY['identity:create', 'identity:read', 'identity:link', 'profile:read'], 'inactive'
FROM public.integration_applications
WHERE slug = 'ziks-got-talent';