-- ---------- Finding 3 helper: lifecycle + entitlement ----------
CREATE OR REPLACE FUNCTION public.studio_management_allowed(_studio_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.studios s
    WHERE s.id = _studio_id
      AND s.is_active = true
      AND public.has_studio_entitlement(s.owner_id)
  )
$$;

REVOKE ALL ON FUNCTION public.studio_management_allowed(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.studio_management_allowed(uuid) TO authenticated, service_role;

-- ---------- Finding 1 + 3: role-first capability evaluation ----------
CREATE OR REPLACE FUNCTION public.studio_role_capability(_role public.studio_role, _capability text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE _capability
    WHEN 'manage_studio'        THEN _role IN ('owner','admin')
    WHEN 'manage_members'       THEN _role IN ('owner','admin')
    WHEN 'manage_equipment'     THEN _role IN ('owner','admin','manager','staff')
    WHEN 'manage_portfolio'     THEN _role IN ('owner','admin','manager','staff','contributor')
    WHEN 'delete_portfolio'     THEN _role IN ('owner','admin','manager')
    WHEN 'delete_equipment'     THEN _role IN ('owner','admin','manager')
    WHEN 'request_verification' THEN _role IN ('owner','admin')
    WHEN 'view_analytics'       THEN _role IN ('owner','admin','manager')
    WHEN 'delete_studio'        THEN _role = 'owner'
    ELSE false
  END
$$;

REVOKE ALL ON FUNCTION public.studio_role_capability(public.studio_role, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.studio_role_capability(public.studio_role, text) TO authenticated, service_role;

-- Role is the authoritative maximum; the permissions JSONB may only narrow it.
CREATE OR REPLACE FUNCTION public.has_studio_capability(_user_id uuid, _studio_id uuid, _capability text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _role public.studio_role;
  _perms jsonb;
  _override jsonb;
BEGIN
  IF _user_id IS NULL OR _studio_id IS NULL OR _capability IS NULL THEN
    RETURN false;
  END IF;

  SELECT role, permissions INTO _role, _perms
  FROM public.studio_members
  WHERE studio_id = _studio_id AND user_id = _user_id AND status = 'active'
  LIMIT 1;

  IF _role IS NULL THEN
    RETURN false;
  END IF;

  -- 1. Role baseline is the ceiling. JSONB can never widen it.
  IF NOT public.studio_role_capability(_role, _capability) THEN
    RETURN false;
  END IF;

  -- 2. Explicit per-member override may only revoke.
  _override := COALESCE(_perms, '{}'::jsonb) -> _capability;
  IF _override IS NOT NULL AND _override::text <> 'true' THEN
    RETURN false;
  END IF;

  -- 3. Lifecycle + entitlement gate for management capabilities.
  --    delete_studio and view_analytics stay reachable so a downgraded or
  --    deactivated studio can still be inspected and resolved by its owner.
  IF _capability NOT IN ('view_analytics', 'delete_studio')
     AND NOT public.studio_management_allowed(_studio_id) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.has_studio_capability(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_studio_capability(uuid, uuid, text) TO authenticated, service_role;

-- ---------- Finding 1: stored permissions can never encode an escalation ----------
CREATE OR REPLACE FUNCTION public.guard_studio_member_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _key text;
  _owner uuid;
BEGIN
  SELECT owner_id INTO _owner FROM public.studios WHERE id = NEW.studio_id;

  IF NEW.role = 'owner'::public.studio_role AND NEW.user_id IS DISTINCT FROM _owner THEN
    RAISE EXCEPTION 'Ownership is set through ownership transfer, not the roster'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.permissions IS NULL OR NEW.permissions = '{}'::jsonb THEN
    RETURN NEW;
  END IF;

  FOR _key IN SELECT jsonb_object_keys(NEW.permissions) LOOP
    IF NOT public.studio_role_capability(NEW.role, _key) THEN
      NEW.permissions := NEW.permissions - _key;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_studio_member_permissions ON public.studio_members;
CREATE TRIGGER guard_studio_member_permissions
BEFORE INSERT OR UPDATE ON public.studio_members
FOR EACH ROW EXECUTE FUNCTION public.guard_studio_member_permissions();

-- ---------- Finding 2: owner deletion must not destroy the studio ----------
ALTER TABLE public.studios DROP CONSTRAINT studios_owner_id_fkey;
ALTER TABLE public.studios
  ADD CONSTRAINT studios_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION public.studio_ownership_block(_user_id uuid)
RETURNS TABLE(studio_id uuid, handle text, name text, is_active boolean, eligible_successors bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT s.id, s.handle, s.name, s.is_active,
         (SELECT count(*) FROM public.studio_members m
          WHERE m.studio_id = s.id AND m.status = 'active' AND m.user_id <> s.owner_id)
  FROM public.studios s
  WHERE s.owner_id = _user_id
$$;

REVOKE ALL ON FUNCTION public.studio_ownership_block(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.studio_ownership_block(uuid) TO authenticated, service_role;

-- ---------- Finding 4: private studio media policies ----------
DROP POLICY IF EXISTS "Studio members read private studio media" ON storage.objects;
CREATE POLICY "Studio members read private studio media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'studio-private-media'
  AND public.is_studio_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

DROP POLICY IF EXISTS "Capable members write private studio media" ON storage.objects;
CREATE POLICY "Capable members write private studio media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'studio-private-media'
  AND (
    public.has_studio_capability(auth.uid(), ((storage.foldername(name))[1])::uuid, 'manage_portfolio')
    OR public.has_studio_capability(auth.uid(), ((storage.foldername(name))[1])::uuid, 'manage_studio')
  )
);

DROP POLICY IF EXISTS "Capable members update private studio media" ON storage.objects;
CREATE POLICY "Capable members update private studio media"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'studio-private-media'
  AND (
    public.has_studio_capability(auth.uid(), ((storage.foldername(name))[1])::uuid, 'manage_portfolio')
    OR public.has_studio_capability(auth.uid(), ((storage.foldername(name))[1])::uuid, 'manage_studio')
  )
);

DROP POLICY IF EXISTS "Capable members delete private studio media" ON storage.objects;
CREATE POLICY "Capable members delete private studio media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'studio-private-media'
  AND (
    public.has_studio_capability(auth.uid(), ((storage.foldername(name))[1])::uuid, 'delete_portfolio')
    OR public.has_studio_capability(auth.uid(), ((storage.foldername(name))[1])::uuid, 'manage_studio')
  )
);

-- Secondary hardening D: studio writes in the public bucket become capability-level.
DROP POLICY IF EXISTS "Studio members upload studio media" ON storage.objects;
CREATE POLICY "Capable members upload studio media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'portfolios'
  AND (storage.foldername(name))[1] = 'studios'
  AND (
    public.has_studio_capability(auth.uid(), ((storage.foldername(name))[2])::uuid, 'manage_portfolio')
    OR public.has_studio_capability(auth.uid(), ((storage.foldername(name))[2])::uuid, 'manage_studio')
  )
);

DROP POLICY IF EXISTS "Studio members update studio media" ON storage.objects;
CREATE POLICY "Capable members update studio media"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'portfolios'
  AND (storage.foldername(name))[1] = 'studios'
  AND (
    public.has_studio_capability(auth.uid(), ((storage.foldername(name))[2])::uuid, 'manage_portfolio')
    OR public.has_studio_capability(auth.uid(), ((storage.foldername(name))[2])::uuid, 'manage_studio')
  )
);

DROP POLICY IF EXISTS "Studio members delete studio media" ON storage.objects;
CREATE POLICY "Capable members delete studio media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'portfolios'
  AND (storage.foldername(name))[1] = 'studios'
  AND (
    public.has_studio_capability(auth.uid(), ((storage.foldername(name))[2])::uuid, 'delete_portfolio')
    OR public.has_studio_capability(auth.uid(), ((storage.foldername(name))[2])::uuid, 'manage_studio')
  )
);

-- ---------- Finding 4: private studio portfolio rows are no longer world-readable ----------
DROP POLICY IF EXISTS "Portfolio items are viewable by everyone" ON public.portfolio_items;
CREATE POLICY "Personal and public studio portfolio is viewable"
ON public.portfolio_items FOR SELECT TO public
USING (
  studio_id IS NULL
  OR EXISTS (
    SELECT 1 FROM public.studios s
    WHERE s.id = portfolio_items.studio_id
      AND s.visibility = 'public'
      AND s.is_active = true
      AND s.is_hidden = false
  )
);

DROP POLICY IF EXISTS "Studio members view studio portfolio" ON public.portfolio_items;
CREATE POLICY "Studio members view studio portfolio"
ON public.portfolio_items FOR SELECT TO authenticated
USING (studio_id IS NOT NULL AND public.is_studio_member(auth.uid(), studio_id));

-- Secondary hardening C: studio portfolio deletion needs delete_portfolio.
DROP POLICY IF EXISTS "Capable members manage studio portfolio" ON public.portfolio_items;
CREATE POLICY "Capable members add studio portfolio"
ON public.portfolio_items FOR INSERT TO authenticated
WITH CHECK (studio_id IS NOT NULL AND public.has_studio_capability(auth.uid(), studio_id, 'manage_portfolio'));

CREATE POLICY "Capable members update studio portfolio"
ON public.portfolio_items FOR UPDATE TO authenticated
USING (studio_id IS NOT NULL AND public.has_studio_capability(auth.uid(), studio_id, 'manage_portfolio'))
WITH CHECK (studio_id IS NOT NULL AND public.has_studio_capability(auth.uid(), studio_id, 'manage_portfolio'));

CREATE POLICY "Capable members delete studio portfolio"
ON public.portfolio_items FOR DELETE TO authenticated
USING (studio_id IS NOT NULL AND public.has_studio_capability(auth.uid(), studio_id, 'delete_portfolio'));

-- ---------- Finding 5: approximate public coordinates ----------
DROP FUNCTION IF EXISTS public.get_public_studio(text);
CREATE FUNCTION public.get_public_studio(_handle text)
RETURNS TABLE(
  id uuid, handle text, name text, org_type text, tagline text, bio text,
  logo_url text, cover_url text, primary_city text, primary_country text,
  latitude double precision, longitude double precision, contact_email text,
  social_links jsonb, facilities text[], is_verified boolean,
  created_at timestamp with time zone, member_count bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT s.id, s.handle, s.name, s.org_type::text, s.tagline, s.bio, s.logo_url, s.cover_url,
         s.primary_city, s.primary_country,
         CASE WHEN s.latitude IS NULL THEN NULL
              ELSE round(s.latitude::numeric, 2)::double precision END,
         CASE WHEN s.longitude IS NULL THEN NULL
              ELSE round(s.longitude::numeric, 2)::double precision END,
         s.contact_email,
         s.social_links, s.facilities, s.is_verified, s.created_at,
         (SELECT count(*) FROM public.studio_members m WHERE m.studio_id = s.id AND m.status = 'active')
  FROM public.studios s
  WHERE lower(s.handle) = lower(_handle)
    AND s.is_active AND NOT s.is_hidden AND s.visibility = 'public'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_studio(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_studio(text) TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.get_nearby_studios(double precision, double precision, double precision, integer);
CREATE FUNCTION public.get_nearby_studios(_lat double precision, _lng double precision, _radius_km double precision DEFAULT 100, _limit integer DEFAULT 20)
RETURNS TABLE(id uuid, handle text, name text, tagline text, logo_url text, primary_city text, primary_country text, is_verified boolean, distance_km double precision)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT s.id, s.handle, s.name, s.tagline, s.logo_url, s.primary_city, s.primary_country, s.is_verified,
         round((6371 * acos(LEAST(1, GREATEST(-1,
            cos(radians(_lat)) * cos(radians(s.latitude)) * cos(radians(s.longitude) - radians(_lng))
            + sin(radians(_lat)) * sin(radians(s.latitude))
         ))))::numeric, 1)::double precision AS distance_km
  FROM public.studios s
  WHERE s.is_active AND NOT s.is_hidden AND s.visibility = 'public'
    AND s.latitude IS NOT NULL AND s.longitude IS NOT NULL
    AND (6371 * acos(LEAST(1, GREATEST(-1,
          cos(radians(_lat)) * cos(radians(s.latitude)) * cos(radians(s.longitude) - radians(_lng))
          + sin(radians(_lat)) * sin(radians(s.latitude))
       )))) <= COALESCE(_radius_km, 100)
  ORDER BY distance_km ASC
  LIMIT LEAST(COALESCE(_limit, 20), 50);
$$;

REVOKE ALL ON FUNCTION public.get_nearby_studios(double precision, double precision, double precision, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_nearby_studios(double precision, double precision, double precision, integer) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.list_studio_public_equipment(_studio_id uuid, _limit integer DEFAULT 50)
RETURNS TABLE(id uuid, name text, category text, brand text, model text, description text, photo_url text, quantity integer, is_available boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT e.id, e.name, e.category, e.brand, e.model, e.description, e.photo_url, e.quantity, e.is_available
  FROM public.studio_equipment e
  JOIN public.studios s ON s.id = e.studio_id
  WHERE e.studio_id = _studio_id
    AND s.is_active AND NOT s.is_hidden AND s.visibility = 'public'
  ORDER BY e.created_at DESC
  LIMIT LEAST(COALESCE(_limit, 50), 200);
$$;
