-- ============================================================
-- 1. STUDIO AUDIT LOGGING (reuses admin_audit_logs)
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_studio_audit(
  _actor uuid,
  _action text,
  _studio_id uuid,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _label text;
BEGIN
  IF _actor IS NULL OR _studio_id IS NULL THEN
    RETURN;
  END IF;

  SELECT s.name INTO _label FROM public.studios s WHERE s.id = _studio_id;

  INSERT INTO public.admin_audit_logs (actor_id, actor_role, action, target_type, target_id, target_label, metadata)
  VALUES (
    _actor,
    'studio',
    _action,
    'studio',
    _studio_id,
    _label,
    COALESCE(_metadata, '{}'::jsonb) || jsonb_build_object('studio_id', _studio_id)
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'log_studio_audit(%) failed: %', _action, SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION public.log_studio_audit(uuid, text, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_studio_audit(uuid, text, uuid, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_studio_audit(uuid, text, uuid, jsonb) TO service_role;

-- studios: create / activate / deactivate / ownership / verification
CREATE OR REPLACE FUNCTION public.audit_studio_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_studio_audit(
      COALESCE(auth.uid(), NEW.owner_id), 'studio_created', NEW.id,
      jsonb_build_object('handle', NEW.handle, 'org_type', NEW.org_type)
    );
    RETURN NEW;
  END IF;

  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    PERFORM public.log_studio_audit(
      COALESCE(auth.uid(), OLD.owner_id), 'studio_ownership_transferred', NEW.id,
      jsonb_build_object('previous_owner_id', OLD.owner_id, 'new_owner_id', NEW.owner_id)
    );
  END IF;

  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    PERFORM public.log_studio_audit(
      COALESCE(auth.uid(), NEW.owner_id),
      CASE WHEN NEW.is_active THEN 'studio_activated' ELSE 'studio_deactivated' END,
      NEW.id, '{}'::jsonb
    );
  END IF;

  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
    PERFORM public.log_studio_audit(
      COALESCE(auth.uid(), NEW.owner_id), 'studio_verification_changed', NEW.id,
      jsonb_build_object('is_verified', NEW.is_verified)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_studio_changes ON public.studios;
CREATE TRIGGER audit_studio_changes
AFTER INSERT OR UPDATE ON public.studios
FOR EACH ROW EXECUTE FUNCTION public.audit_studio_changes();

-- studio_members: joined / removed / role changed / suspended / reinstated / permissions
CREATE OR REPLACE FUNCTION public.audit_studio_member_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_studio_audit(
      COALESCE(auth.uid(), NEW.user_id), 'studio_member_joined', NEW.studio_id,
      jsonb_build_object('member_id', NEW.user_id, 'role', NEW.role)
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    PERFORM public.log_studio_audit(
      COALESCE(auth.uid(), OLD.user_id), 'studio_member_removed', OLD.studio_id,
      jsonb_build_object('member_id', OLD.user_id, 'role', OLD.role)
    );
    RETURN OLD;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    PERFORM public.log_studio_audit(
      COALESCE(auth.uid(), NEW.user_id), 'studio_member_role_changed', NEW.studio_id,
      jsonb_build_object('member_id', NEW.user_id, 'from_role', OLD.role, 'to_role', NEW.role)
    );
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.log_studio_audit(
      COALESCE(auth.uid(), NEW.user_id),
      CASE WHEN NEW.status = 'active' THEN 'studio_member_reinstated' ELSE 'studio_member_suspended' END,
      NEW.studio_id,
      jsonb_build_object('member_id', NEW.user_id, 'status', NEW.status)
    );
  END IF;

  IF COALESCE(NEW.permissions, '{}'::jsonb) IS DISTINCT FROM COALESCE(OLD.permissions, '{}'::jsonb) THEN
    PERFORM public.log_studio_audit(
      COALESCE(auth.uid(), NEW.user_id), 'studio_permissions_changed', NEW.studio_id,
      jsonb_build_object('member_id', NEW.user_id, 'permission_keys',
        (SELECT COALESCE(jsonb_agg(k), '[]'::jsonb) FROM jsonb_object_keys(COALESCE(NEW.permissions, '{}'::jsonb)) k))
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_studio_member_changes ON public.studio_members;
CREATE TRIGGER audit_studio_member_changes
AFTER INSERT OR UPDATE OR DELETE ON public.studio_members
FOR EACH ROW EXECUTE FUNCTION public.audit_studio_member_changes();

-- studio_invites: invited
CREATE OR REPLACE FUNCTION public.audit_studio_invite_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_studio_audit(
    COALESCE(auth.uid(), NEW.invited_by), 'studio_member_invited', NEW.studio_id,
    jsonb_build_object('invite_id', NEW.id, 'invited_user_id', NEW.invited_user_id, 'role', NEW.role)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_studio_invite_created ON public.studio_invites;
CREATE TRIGGER audit_studio_invite_created
AFTER INSERT ON public.studio_invites
FOR EACH ROW EXECUTE FUNCTION public.audit_studio_invite_created();

-- verification requested (studio requests only)
CREATE OR REPLACE FUNCTION public.audit_studio_verification_requested()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.request_type = 'studio' AND (NEW.verification_data->>'studio_id') IS NOT NULL THEN
    PERFORM public.log_studio_audit(
      COALESCE(auth.uid(), NEW.user_id), 'studio_verification_requested',
      (NEW.verification_data->>'studio_id')::uuid,
      jsonb_build_object('request_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_studio_verification_requested ON public.verification_requests;
CREATE TRIGGER audit_studio_verification_requested
AFTER INSERT ON public.verification_requests
FOR EACH ROW EXECUTE FUNCTION public.audit_studio_verification_requested();

-- ============================================================
-- 2. NOTIFICATION PUSH MAPPING (extend existing mapping only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.dispatch_push_for_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kind text;
  v_allowed boolean;
BEGIN
  v_kind := COALESCE(NEW.data->>'push_kind', NEW.type);

  SELECT CASE v_kind
    WHEN 'invites' THEN s.notify_push_invites
    WHEN 'studio_invite' THEN s.notify_push_invites
    WHEN 'invite_responses' THEN s.notify_push_invite_responses
    WHEN 'studio_ownership_transfer' THEN s.notify_push_invite_responses
    WHEN 'room_activity' THEN s.notify_push_room_activity
    WHEN 'studio_deactivated' THEN s.notify_push_room_activity
    WHEN 'studio_reactivated' THEN s.notify_push_room_activity
    WHEN 'role_requests' THEN s.notify_push_role_requests
    ELSE false
  END INTO v_allowed
  FROM public.user_settings s
  WHERE s.user_id = NEW.user_id;

  IF COALESCE(v_allowed, false) = false THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := 'https://lihctrhzsyjqnlzwwkzo.supabase.co/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key'
        )
      ),
      body := jsonb_build_object(
        'userId', NEW.user_id,
        'title', NEW.title,
        'body', NEW.message,
        'url', COALESCE(NEW.data->>'url', '/notifications'),
        'data', NEW.data
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'dispatch_push_for_notification failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- studio invite notification: add push_kind + url
CREATE OR REPLACE FUNCTION public.notify_studio_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _studio_name text; _handle text;
BEGIN
  SELECT name, handle INTO _studio_name, _handle FROM public.studios WHERE id = NEW.studio_id;
  INSERT INTO public.user_notifications (user_id, type, title, message, data)
  VALUES (
    NEW.invited_user_id,
    'studio_invite',
    'Studio invitation',
    COALESCE(_studio_name, 'A studio') || ' invited you to join as ' || NEW.role::text,
    jsonb_build_object(
      'invite_id', NEW.id, 'studio_id', NEW.studio_id, 'studio_handle', _handle, 'role', NEW.role,
      'push_kind', 'studio_invite', 'url', '/studios'
    )
  );
  RETURN NEW;
END;
$$;

-- lifecycle notifications: add push_kind + url
CREATE OR REPLACE FUNCTION public.set_studio_active(_studio_id uuid, _active boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _studio_name text;
  _handle text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT s.name, s.handle INTO _studio_name, _handle
  FROM public.studios s
  WHERE s.id = _studio_id AND s.owner_id = _uid;

  IF _studio_name IS NULL THEN
    RAISE EXCEPTION 'Only the studio owner can change activation';
  END IF;

  UPDATE public.studios
  SET is_active = _active, updated_at = now()
  WHERE id = _studio_id;

  INSERT INTO public.user_notifications (user_id, type, title, message, data)
  SELECT m.user_id,
         CASE WHEN _active THEN 'studio_reactivated' ELSE 'studio_deactivated' END,
         CASE WHEN _active THEN _studio_name || ' is live again' ELSE _studio_name || ' was deactivated' END,
         CASE WHEN _active
              THEN _studio_name || ' is public again.'
              ELSE _studio_name || ' is no longer visible publicly. Nothing was deleted.'
         END,
         jsonb_build_object(
           'studio_id', _studio_id,
           'push_kind', CASE WHEN _active THEN 'studio_reactivated' ELSE 'studio_deactivated' END,
           'url', '/studios/' || _handle
         )
  FROM public.studio_members m
  WHERE m.studio_id = _studio_id AND m.status = 'active' AND m.user_id <> _uid;
END;
$$;

CREATE OR REPLACE FUNCTION public.transfer_studio_ownership(_studio_id uuid, _new_owner_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _studio_name text;
  _handle text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT s.name, s.handle INTO _studio_name, _handle
  FROM public.studios s
  WHERE s.id = _studio_id AND s.owner_id = _uid;

  IF _studio_name IS NULL THEN
    RAISE EXCEPTION 'Only the studio owner can transfer ownership';
  END IF;

  IF _new_owner_id = _uid THEN
    RAISE EXCEPTION 'You already own this studio';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.studio_members m
    WHERE m.studio_id = _studio_id AND m.user_id = _new_owner_id AND m.status = 'active'
  ) THEN
    RAISE EXCEPTION 'The new owner must be an active studio member';
  END IF;

  UPDATE public.studios SET owner_id = _new_owner_id, updated_at = now() WHERE id = _studio_id;

  UPDATE public.studio_members
  SET role = 'owner'::studio_role, updated_at = now()
  WHERE studio_id = _studio_id AND user_id = _new_owner_id;

  UPDATE public.studio_members
  SET role = 'admin'::studio_role, updated_at = now()
  WHERE studio_id = _studio_id AND user_id = _uid;

  INSERT INTO public.user_notifications (user_id, type, title, message, data)
  VALUES (
    _new_owner_id, 'studio_ownership_transferred', 'You now own ' || _studio_name,
    'Ownership of ' || _studio_name || ' was transferred to you.',
    jsonb_build_object(
      'studio_id', _studio_id,
      'push_kind', 'studio_ownership_transfer',
      'url', '/studios/' || _handle || '/manage'
    )
  );
END;
$$;

-- ============================================================
-- 3. EQUIPMENT PAGINATION (additive parameter, same defaults)
-- ============================================================
CREATE OR REPLACE FUNCTION public.list_studio_public_equipment(
  _studio_id uuid,
  _limit integer DEFAULT 50,
  _offset integer DEFAULT 0
)
RETURNS TABLE(id uuid, name text, category text, brand text, model text, description text, photo_url text, quantity integer, is_available boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id, e.name, e.category, e.brand, e.model, e.description, e.photo_url, e.quantity, e.is_available
  FROM public.studio_equipment e
  JOIN public.studios s ON s.id = e.studio_id
  WHERE e.studio_id = _studio_id
    AND s.is_active AND NOT s.is_hidden AND s.visibility = 'public'
  ORDER BY e.created_at DESC
  LIMIT LEAST(COALESCE(_limit, 50), 200)
  OFFSET GREATEST(COALESCE(_offset, 0), 0);
$$;

REVOKE ALL ON FUNCTION public.list_studio_public_equipment(uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_studio_public_equipment(uuid, integer, integer) TO anon, authenticated, service_role;

-- ============================================================
-- 4. RETENTION + ROPA COVERAGE (reuses existing structures)
-- ============================================================
INSERT INTO public.retention_policies
  (category, description, retention_rule, retention_days, justification, deletion_behaviour, is_automated, target_table, target_column, target_condition)
VALUES
  ('Studio records',
   'Studio profiles (name, handle, bio, city, facilities, contact email) for active studios.',
   'Kept while the studio is active', NULL,
   'Needed to operate the studio profile and its public listing.',
   'Deleted when the owner deletes the studio; deactivation hides the studio without deleting data', false,
   NULL, NULL, NULL),
  ('Studio membership',
   'Studio team roster: role, title, status and per-member permission overrides.',
   'Kept while the studio exists', NULL,
   'Needed to decide who may act on behalf of the studio.',
   'Removed when the member leaves or the studio is deleted', false,
   NULL, NULL, NULL),
  ('Studio equipment',
   'Studio gear inventory shown on the public studio profile.',
   'Kept while the studio exists', NULL,
   'Part of the studio profile content.',
   'Deleted with the item or with the studio', false,
   NULL, NULL, NULL),
  ('Studio invitations',
   'Pending and resolved studio team invitations.',
   'Resolved invitations 12 months; pending invitations kept until answered or cancelled', 365,
   'Short retention gives the studio and the invitee a record of the decision without keeping it indefinitely.',
   'Automatic purge of resolved invitations', true,
   'studio_invites', 'created_at', 'status IN (''declined'',''cancelled'',''expired'')'),
  ('Studio follows',
   'Which creatives follow or watch a studio.',
   'Kept while the follow exists', NULL,
   'Powers studio following; removed as soon as the user unfollows.',
   'Deleted on unfollow, account deletion or studio deletion', false,
   NULL, NULL, NULL),
  ('Studio portfolio records',
   'Studio-owned portfolio items (portfolio_items rows carrying a studio_id) and their media.',
   'Kept while the studio exists', NULL,
   'Studio work samples are profile content controlled by the studio.',
   'Deleted with the item or with the studio', false,
   NULL, NULL, NULL)
ON CONFLICT DO NOTHING;

INSERT INTO public.data_inventory
  (table_name, field_name, data_category, purpose, lawful_basis, is_required, visibility, storage_location, third_parties, retention, deletion_behaviour, security_classification, user_visible_label)
VALUES
  ('studios', 'name, handle, tagline, bio, primary_city, primary_country, contact_email, social_links, logo_url, cover_url',
   'Business profile data', 'Operate and publicly list a studio, agency-style creative house profile', 'Contract', true,
   'public', 'Lovable Cloud (Postgres) + object storage', 'None',
   'Kept while the studio is active', 'Deleted with the studio; deactivation hides it', 'internal',
   'Your studio profile'),
  ('studios', 'owner_id, latitude, longitude',
   'Identifiers and location', 'Attribute studio ownership and support proximity discovery', 'Legitimate interest', false,
   'internal', 'Lovable Cloud (Postgres)', 'None',
   'Kept while the studio is active', 'Deleted with the studio (coordinates are exposed only rounded)', 'confidential',
   'Studio owner and approximate location'),
  ('studio_members', 'user_id, role, title, status, permissions, creative_roles',
   'Membership and authorisation data', 'Decide who may act for a studio and display the public team', 'Contract', true,
   'public', 'Lovable Cloud (Postgres)', 'None',
   'Kept while the studio exists', 'Removed when the member leaves or the studio is deleted', 'confidential',
   'Your studio team membership'),
  ('studio_equipment', 'name, category, brand, model, description, photo_url, quantity, is_available, created_by',
   'Business inventory data', 'Show studio gear on the public studio profile', 'Contract', false,
   'public', 'Lovable Cloud (Postgres) + object storage', 'None',
   'Kept while the studio exists', 'Deleted with the item or the studio', 'internal',
   'Studio equipment list'),
  ('studio_invites', 'invited_user_id, invited_by, role, title, message, status',
   'Membership data', 'Invite creatives to a studio team and record the response', 'Contract', false,
   'members', 'Lovable Cloud (Postgres)', 'None',
   'Resolved invitations 12 months', 'Automatic purge of resolved invitations', 'confidential',
   'Studio invitations you sent or received'),
  ('studio_follows', 'user_id, studio_id, kind',
   'Engagement data', 'Let creatives follow studios they care about', 'Legitimate interest', false,
   'internal', 'Lovable Cloud (Postgres)', 'None',
   'Kept while the follow exists', 'Deleted on unfollow or account deletion', 'internal',
   'Studios you follow'),
  ('portfolio_items', 'studio_id',
   'Content ownership link', 'Attribute portfolio work to a studio instead of an individual', 'Contract', false,
   'public', 'Lovable Cloud (Postgres) + object storage', 'None',
   'Kept while the studio exists', 'Deleted with the item or the studio', 'internal',
   'Studio work samples')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. RESIDUAL PRIVILEGE CLEANUP
--    Public studio reads run through SECURITY DEFINER RPCs, so anon needs
--    no write privileges on studio tables. SELECT is left intact so the
--    existing public read policies keep working unchanged.
-- ============================================================
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON
  public.studios, public.studio_members, public.studio_equipment,
  public.studio_invites, public.studio_follows
FROM anon;

-- Trigger-only helpers never need to be callable from the API.
REVOKE ALL ON FUNCTION public.guard_studio_member_permissions() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_studio_protected_fields() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_studio_changes() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_studio_member_changes() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_studio_invite_created() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_studio_verification_requested() FROM anon, authenticated;