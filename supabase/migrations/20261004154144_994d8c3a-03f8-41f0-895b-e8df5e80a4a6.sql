ALTER TABLE public.newsletter_recipients DROP CONSTRAINT IF EXISTS newsletter_recipients_status_check;
ALTER TABLE public.newsletter_recipients ADD CONSTRAINT newsletter_recipients_status_check CHECK (status IN (
  'pending','processing','sent','failed','temporarily_failed','unknown','bounced','skipped','unsubscribed','invalid','rate_limited'));
ALTER TABLE public.newsletter_recipients
  ADD COLUMN IF NOT EXISTS worker_id text,
  ADD COLUMN IF NOT EXISTS send_key text,
  ADD COLUMN IF NOT EXISTS processing_started_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_recipients_send_key_key ON public.newsletter_recipients (send_key) WHERE send_key IS NOT NULL;
ALTER TABLE public.scheduled_newsletters ADD COLUMN IF NOT EXISTS total_unknown integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.mkt_warmup_steps() RETURNS int[] LANGUAGE sql IMMUTABLE SET search_path = public
AS $$ SELECT ARRAY[30,60,150,300,600,1500,3000,9000,30000] $$;

CREATE OR REPLACE FUNCTION public.mkt_guard_limit() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  steps int[] := public.mkt_warmup_steps();
  new_lim int;
  old_lim int;
  old_idx int;
  new_idx int;
BEGIN
  IF NEW.setting_key <> 'marketing_email_limits' THEN RETURN NEW; END IF;
  BEGIN
    new_lim := (NEW.setting_value->>'daily_limit')::int;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'Marketing limit must be a whole number';
  END;
  new_idx := array_position(steps, new_lim);
  IF new_idx IS NULL THEN
    RAISE EXCEPTION 'Marketing limit must be a QueenSMTP warm-up step (%).', array_to_string(steps, ', ');
  END IF;
  IF COALESCE((NEW.setting_value->>'window_hours')::int, 24) <> 24 THEN
    RAISE EXCEPTION 'Marketing window must be 24 hours (QueenSMTP rolling window)';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    old_lim := (OLD.setting_value->>'daily_limit')::int;
    old_idx := array_position(steps, old_lim);
    IF old_idx IS NOT NULL AND new_idx > old_idx + 1 THEN
      RAISE EXCEPTION 'Raise the marketing limit one warm-up step at a time (next allowed: %).', steps[old_idx + 1];
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS mkt_guard_limit ON public.admin_settings;
CREATE TRIGGER mkt_guard_limit BEFORE INSERT OR UPDATE ON public.admin_settings
  FOR EACH ROW EXECUTE FUNCTION public.mkt_guard_limit();

CREATE OR REPLACE FUNCTION public.mkt_acquire_lease(_owner text, _ttl_seconds int DEFAULT 300)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO admin_settings (setting_key, setting_value)
  VALUES ('marketing_worker_lease', jsonb_build_object('owner', NULL, 'until', '1970-01-01T00:00:00Z'))
  ON CONFLICT (setting_key) DO NOTHING;
  UPDATE admin_settings
     SET setting_value = jsonb_build_object('owner', _owner, 'until', now() + make_interval(secs => _ttl_seconds)),
         updated_at = now()
   WHERE setting_key = 'marketing_worker_lease'
     AND (COALESCE((setting_value->>'until')::timestamptz, 'epoch') < now() OR setting_value->>'owner' = _owner);
  RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.mkt_release_lease(_owner text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE admin_settings SET setting_value = jsonb_build_object('owner', NULL, 'until', '1970-01-01T00:00:00Z'), updated_at = now()
   WHERE setting_key = 'marketing_worker_lease' AND setting_value->>'owner' = _owner;
$$;

CREATE OR REPLACE FUNCTION public.mkt_capacity()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  lim int; win int := 24; used int; inflight int; unknown_n int; oldest timestamptz; paused timestamptz;
BEGIN
  SELECT (setting_value->>'daily_limit')::int INTO lim FROM admin_settings WHERE setting_key = 'marketing_email_limits';
  IF lim IS NULL OR array_position(public.mkt_warmup_steps(), lim) IS NULL THEN lim := 30; END IF;
  SELECT count(*), min(accepted_at) INTO used, oldest FROM newsletter_recipients
   WHERE accepted_at >= now() - make_interval(hours => win) AND COALESCE(error_code, '') <> 'legacy_sent';
  SELECT count(*) INTO inflight FROM newsletter_recipients WHERE status = 'processing';
  SELECT count(*) INTO unknown_n FROM newsletter_recipients
   WHERE status = 'unknown' AND last_attempt_at >= now() - make_interval(hours => win);
  SELECT NULLIF(setting_value->>'paused_until', '')::timestamptz INTO paused FROM admin_settings WHERE setting_key = 'marketing_send_state';
  RETURN jsonb_build_object(
    'daily_limit', lim, 'window_hours', win, 'used', used, 'in_flight', inflight, 'unknown', unknown_n,
    'remaining', GREATEST(lim - used - inflight - unknown_n, 0),
    'oldest_accepted', oldest,
    'next_capacity_at', CASE WHEN oldest IS NULL THEN NULL ELSE oldest + make_interval(hours => win) END,
    'paused_until', CASE WHEN paused > now() THEN paused ELSE NULL END);
END $$;

CREATE OR REPLACE FUNCTION public.mkt_reap_stale(_older_than_s int DEFAULT 600)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  UPDATE newsletter_recipients SET status = 'unknown', error_code = 'worker_lost',
         error_message = 'Worker stopped during the provider request; not resent to avoid duplicates', worker_id = NULL
   WHERE status = 'processing' AND COALESCE(processing_started_at, last_attempt_at, updated_at) < now() - make_interval(secs => _older_than_s);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.mkt_next_campaign(_owner text)
RETURNS TABLE (id uuid, subject text, content text, audience text, recipients_prepared boolean, sent_recipients jsonb, updated_at timestamptz, previous_status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record;
BEGIN
  SELECT s.* INTO c FROM scheduled_newsletters s
   WHERE s.scheduled_at <= now()
     AND ( s.status = 'pending' AND (s.next_attempt_at IS NULL OR s.next_attempt_at <= now())
        OR (s.status = 'paused' AND s.paused_reason = 'rate_limit' AND s.next_attempt_at <= now())
        OR (s.status = 'processing' AND (s.locked_until IS NULL OR s.locked_until < now())) )
   ORDER BY s.scheduled_at, s.id
   FOR UPDATE SKIP LOCKED LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;
  UPDATE scheduled_newsletters SET status = 'processing', locked_until = now() + interval '10 minutes',
         paused_reason = NULL, last_error = NULL, updated_at = now()
   WHERE scheduled_newsletters.id = c.id;
  RETURN QUERY SELECT c.id, c.subject, c.content, c.audience, c.recipients_prepared, c.sent_recipients, c.updated_at, c.status;
END $$;

CREATE OR REPLACE FUNCTION public.mkt_claim_next(_campaign uuid, _owner text)
RETURNS SETOF public.newsletter_recipients LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cap jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('marketing_capacity'));
  cap := public.mkt_capacity();
  IF cap->>'paused_until' IS NOT NULL OR (cap->>'remaining')::int <= 0 THEN RETURN; END IF;
  RETURN QUERY
  UPDATE newsletter_recipients r
     SET status = 'processing', attempts = r.attempts + 1, last_attempt_at = now(), processing_started_at = now(),
         worker_id = _owner, send_key = COALESCE(r.send_key, r.campaign_id::text || ':' || r.id::text), next_attempt_at = NULL
   WHERE r.id = (
      SELECT q.id FROM newsletter_recipients q
       WHERE q.campaign_id = _campaign AND q.status IN ('pending','rate_limited','temporarily_failed')
         AND (q.next_attempt_at IS NULL OR q.next_attempt_at <= now())
       ORDER BY q.created_at, q.id
       FOR UPDATE SKIP LOCKED LIMIT 1)
     AND r.status IN ('pending','rate_limited','temporarily_failed')
  RETURNING r.*;
END $$;

CREATE OR REPLACE FUNCTION public.mkt_record_result(
  _id uuid, _owner text, _outcome text, _provider_id text DEFAULT NULL, _code text DEFAULT NULL,
  _message text DEFAULT NULL, _retry_after_s int DEFAULT NULL, _response jsonb DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rec record; ra int; resume timestamptz; delay_s numeric; msg text := left(_message, 500);
BEGIN
  SELECT * INTO rec FROM newsletter_recipients WHERE id = _id FOR UPDATE;
  IF NOT FOUND OR rec.status <> 'processing' OR rec.worker_id IS DISTINCT FROM _owner THEN RETURN 'ignored'; END IF;

  IF _outcome = 'accepted' THEN
    UPDATE newsletter_recipients SET status = 'sent', accepted_at = now(), provider_message_id = _provider_id,
           error_code = NULL, error_message = NULL, worker_id = NULL WHERE id = _id;
    RETURN 'sent';
  ELSIF _outcome = 'rate_limited' THEN
    ra := GREATEST(COALESCE(_retry_after_s, 3600), 60);
    resume := now() + make_interval(secs => ra);
    UPDATE newsletter_recipients SET status = 'rate_limited', attempts = GREATEST(rec.attempts - 1, 0), next_attempt_at = resume,
           error_code = COALESCE(_code, 'daily_limit_reached'), error_message = msg, worker_id = NULL WHERE id = _id;
    INSERT INTO admin_settings (setting_key, setting_value)
    VALUES ('marketing_send_state', jsonb_build_object('paused_until', resume, 'reason', COALESCE(_code, 'daily_limit_reached'),
            'retry_after_s', ra, 'last_429_at', now()))
    ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = now();
    UPDATE scheduled_newsletters SET status = 'paused', paused_reason = 'rate_limit', next_attempt_at = resume, locked_until = NULL,
           last_provider_response = jsonb_build_object('status', 429, 'code', COALESCE(_code, 'daily_limit_reached'), 'retry_after_s', ra, 'body', _response),
           last_error = 'Warm-up limit reached. Campaign paused. Sending will resume automatically.', updated_at = now()
     WHERE scheduled_at <= now()
       AND (status IN ('pending','processing') OR (status = 'paused' AND paused_reason = 'rate_limit'));
    RETURN 'rate_limited';
  ELSIF _outcome = 'temporary' THEN
    IF rec.attempts >= 3 THEN
      UPDATE newsletter_recipients SET status = 'failed', error_code = 'temporary_exhausted', error_message = msg, worker_id = NULL WHERE id = _id;
      RETURN 'failed';
    END IF;
    delay_s := 60 * power(4, rec.attempts - 1) * (0.75 + random() * 0.5);
    UPDATE newsletter_recipients SET status = 'temporarily_failed', next_attempt_at = now() + make_interval(secs => delay_s),
           error_code = COALESCE(_code, 'temporary'), error_message = msg, worker_id = NULL WHERE id = _id;
    RETURN 'temporarily_failed';
  ELSIF _outcome = 'unknown' THEN
    UPDATE newsletter_recipients SET status = 'unknown', error_code = COALESCE(_code, 'unknown_outcome'), error_message = msg, worker_id = NULL WHERE id = _id;
    RETURN 'unknown';
  ELSIF _outcome IN ('bounced','invalid','failed') THEN
    UPDATE newsletter_recipients SET status = _outcome, error_code = _code, error_message = msg, worker_id = NULL WHERE id = _id;
    RETURN _outcome;
  END IF;
  RAISE EXCEPTION 'unknown outcome %', _outcome;
END $$;

CREATE OR REPLACE FUNCTION public.mkt_finalize_campaign(_campaign uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n record; st text; nxt timestamptz;
BEGIN
  SELECT count(*) FILTER (WHERE status IN ('pending','rate_limited','temporarily_failed','processing')) AS queued,
         count(*) FILTER (WHERE status = 'sent') AS sent, count(*) FILTER (WHERE status = 'failed') AS failed,
         count(*) FILTER (WHERE status = 'bounced') AS bounced, count(*) FILTER (WHERE status = 'skipped') AS skipped,
         count(*) FILTER (WHERE status = 'unsubscribed') AS unsub, count(*) FILTER (WHERE status = 'invalid') AS invalid,
         count(*) FILTER (WHERE status = 'unknown') AS unknown_n
    INTO n FROM newsletter_recipients WHERE campaign_id = _campaign;
  UPDATE scheduled_newsletters SET total_queued = n.queued, total_sent = n.sent, total_failed = n.failed, total_bounced = n.bounced,
         total_skipped = n.skipped, total_unsubscribed = n.unsub, total_invalid = n.invalid, total_unknown = n.unknown_n,
         recipients_count = n.sent, updated_at = now()
   WHERE id = _campaign RETURNING status INTO st;
  IF st <> 'processing' THEN RETURN st; END IF;
  IF n.queued = 0 THEN
    UPDATE scheduled_newsletters SET status = 'sent', sent_at = now(), completed_at = now(), locked_until = NULL, next_attempt_at = NULL,
           last_error = CASE WHEN n.unknown_n > 0 THEN n.unknown_n || ' recipient(s) have an unknown delivery result — check the QueenSMTP message log before resending.' END
     WHERE id = _campaign;
    RETURN 'sent';
  END IF;
  SELECT min(COALESCE(next_attempt_at, now())) INTO nxt FROM newsletter_recipients
   WHERE campaign_id = _campaign AND status IN ('pending','rate_limited','temporarily_failed');
  UPDATE scheduled_newsletters SET status = 'pending', locked_until = NULL, next_attempt_at = nxt WHERE id = _campaign;
  RETURN 'pending';
END $$;

CREATE OR REPLACE FUNCTION public.mkt_pause_for_capacity(_resume_at timestamptz)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  UPDATE scheduled_newsletters SET status = 'paused', paused_reason = 'rate_limit', next_attempt_at = _resume_at, locked_until = NULL,
         last_error = 'Warm-up limit reached. Campaign paused. Sending will resume automatically.'
   WHERE scheduled_at <= now() AND (status IN ('pending','processing') OR (status = 'paused' AND paused_reason = 'rate_limit'))
     AND (locked_until IS NULL OR locked_until < now() OR status <> 'processing');
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.mkt_resolve_unknown(_campaign uuid, _action text)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'master_admin') OR has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF _action = 'mark_sent' THEN
    UPDATE newsletter_recipients SET status = 'sent', accepted_at = COALESCE(last_attempt_at, now()), error_code = 'confirmed_by_admin'
     WHERE campaign_id = _campaign AND status = 'unknown';
  ELSIF _action = 'requeue' THEN
    UPDATE newsletter_recipients SET status = 'pending', next_attempt_at = NULL, error_code = 'requeued_by_admin'
     WHERE campaign_id = _campaign AND status = 'unknown';
  ELSE
    RAISE EXCEPTION 'Invalid action';
  END IF;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN
    UPDATE scheduled_newsletters SET status = 'pending', completed_at = NULL, next_attempt_at = NULL
     WHERE id = _campaign AND _action = 'requeue' AND status = 'sent';
  END IF;
  RETURN n;
END $$;

REVOKE ALL ON FUNCTION public.mkt_acquire_lease(text, int), public.mkt_release_lease(text), public.mkt_capacity(),
  public.mkt_reap_stale(int), public.mkt_next_campaign(text), public.mkt_claim_next(uuid, text),
  public.mkt_record_result(uuid, text, text, text, text, text, int, jsonb), public.mkt_finalize_campaign(uuid),
  public.mkt_pause_for_capacity(timestamptz), public.mkt_resolve_unknown(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mkt_acquire_lease(text, int), public.mkt_release_lease(text), public.mkt_capacity(),
  public.mkt_reap_stale(int), public.mkt_next_campaign(text), public.mkt_claim_next(uuid, text),
  public.mkt_record_result(uuid, text, text, text, text, text, int, jsonb), public.mkt_finalize_campaign(uuid),
  public.mkt_pause_for_capacity(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.mkt_resolve_unknown(uuid, text), public.mkt_capacity() TO authenticated, service_role;