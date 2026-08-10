-- Studio V1: server-authoritative creation, ownership transfer and lifecycle.

CREATE OR REPLACE FUNCTION public.has_studio_entitlement(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_subscriptions s
    WHERE s.user_id = _user_id
      AND s.tier = 'studio'::subscription_tier
      AND s.status = 'active'
      AND (s.is_lifetime IS TRUE OR s.current_period_end IS NULL OR s.current_period_end > now())
  )
$$;

REVOKE ALL ON FUNCTION public.has_studio_entitlement(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_studio_entitlement(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.create_studio(
  _handle text,
  _name text,
  _org_type studio_org_type DEFAULT 'studio',
  _tagline text DEFAULT NULL,
  _bio text DEFAULT NULL,
  _primary_city text DEFAULT NULL,
  _primary_country text DEFAULT NULL,
  _contact_email text DEFAULT NULL,
  _facilities text[] DEFAULT '{}'
)
RETURNS TABLE(id uuid, handle text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _clean_handle text := lower(btrim(coalesce(_handle, '')));
  _clean_name text := btrim(coalesce(_name, ''));
  _studio_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.has_studio_entitlement(_uid) THEN
    RAISE EXCEPTION 'A Studio plan is required to create a studio';
  END IF;

  IF length(_clean_name) < 2 THEN
    RAISE EXCEPTION 'Give your studio a name';
  END IF;

  IF _clean_handle !~ '^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$' THEN
    RAISE EXCEPTION 'Handle must be 3-30 lowercase letters, numbers, dashes or underscores';
  END IF;

  IF EXISTS (SELECT 1 FROM public.studios s WHERE lower(s.handle) = _clean_handle) THEN
    RAISE EXCEPTION 'That handle is already taken';
  END IF;

  IF EXISTS (SELECT 1 FROM public.studios s WHERE s.owner_id = _uid) THEN
    RAISE EXCEPTION 'Your plan includes one studio, and you already own one';
  END IF;

  INSERT INTO public.studios (
    owner_id, handle, name, org_type, tagline, bio,
    primary_city, primary_country, contact_email, facilities
  ) VALUES (
    _uid, _clean_handle, _clean_name, coalesce(_org_type, 'studio'::studio_org_type),
    nullif(btrim(coalesce(_tagline, '')), ''), nullif(btrim(coalesce(_bio, '')), ''),
    nullif(btrim(coalesce(_primary_city, '')), ''), nullif(btrim(coalesce(_primary_country, '')), ''),
    nullif(btrim(coalesce(_contact_email, '')), ''), coalesce(_facilities, '{}')
  )
  RETURNING studios.id INTO _studio_id;

  INSERT INTO public.studio_members (studio_id, user_id, role, title, status)
  VALUES (_studio_id, _uid, 'owner'::studio_role, 'Founder', 'active')
  ON CONFLICT (studio_id, user_id) DO NOTHING;

  RETURN QUERY SELECT _studio_id, _clean_handle;
END;
$$;

REVOKE ALL ON FUNCTION public.create_studio(text, text, studio_org_type, text, text, text, text, text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_studio(text, text, studio_org_type, text, text, text, text, text, text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.transfer_studio_ownership(_studio_id uuid, _new_owner_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _studio_name text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT s.name INTO _studio_name
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
    jsonb_build_object('studio_id', _studio_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_studio_ownership(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transfer_studio_ownership(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_studio_active(_studio_id uuid, _active boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _studio_name text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT s.name INTO _studio_name
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
         jsonb_build_object('studio_id', _studio_id)
  FROM public.studio_members m
  WHERE m.studio_id = _studio_id AND m.status = 'active' AND m.user_id <> _uid;
END;
$$;

REVOKE ALL ON FUNCTION public.set_studio_active(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_studio_active(uuid, boolean) TO authenticated;
