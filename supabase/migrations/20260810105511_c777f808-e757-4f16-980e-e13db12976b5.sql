-- ============ ENUMS ============
CREATE TYPE public.studio_org_type AS ENUM ('studio','agency','label','production_company','collective');
CREATE TYPE public.studio_role AS ENUM ('owner','admin','manager','staff','booking_manager','finance_manager','contributor');

-- ============ STUDIOS ============
CREATE TABLE public.studios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_type public.studio_org_type NOT NULL DEFAULT 'studio',
  handle text NOT NULL,
  name text NOT NULL,
  tagline text,
  bio text,
  logo_url text,
  cover_url text,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  primary_city text,
  primary_country text,
  latitude double precision,
  longitude double precision,
  contact_email text,
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  facilities text[] NOT NULL DEFAULT '{}'::text[],
  is_verified boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  is_hidden boolean NOT NULL DEFAULT false,
  visibility text NOT NULL DEFAULT 'public',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT studios_handle_format CHECK (handle ~ '^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])$'),
  CONSTRAINT studios_visibility_check CHECK (visibility IN ('public','private'))
);
CREATE UNIQUE INDEX studios_handle_lower_key ON public.studios (lower(handle));
CREATE INDEX idx_studios_owner_id ON public.studios (owner_id);
CREATE INDEX idx_studios_public ON public.studios (is_active, is_hidden, visibility, created_at DESC);
CREATE INDEX idx_studios_city ON public.studios (lower(primary_city));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.studios TO authenticated;
GRANT ALL ON public.studios TO service_role;
ALTER TABLE public.studios ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_studios_updated_at BEFORE UPDATE ON public.studios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ STUDIO MEMBERS ============
CREATE TABLE public.studio_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.studio_role NOT NULL DEFAULT 'staff',
  title text,
  creative_roles public.creative_role[] NOT NULL DEFAULT '{}',
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (studio_id, user_id),
  CONSTRAINT studio_members_status_check CHECK (status IN ('active','suspended'))
);
CREATE INDEX idx_studio_members_user_id ON public.studio_members (user_id);
CREATE INDEX idx_studio_members_studio_id ON public.studio_members (studio_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_members TO authenticated;
GRANT ALL ON public.studio_members TO service_role;
ALTER TABLE public.studio_members ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_studio_members_updated_at BEFORE UPDATE ON public.studio_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CAPABILITY HELPERS ============
CREATE OR REPLACE FUNCTION public.is_studio_member(_user_id uuid, _studio_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.studio_members
    WHERE studio_id = _studio_id AND user_id = _user_id AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.studio_role_of(_user_id uuid, _studio_id uuid)
RETURNS public.studio_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.studio_members
  WHERE studio_id = _studio_id AND user_id = _user_id AND status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_studio_capability(_user_id uuid, _studio_id uuid, _capability text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _role public.studio_role;
  _perms jsonb;
BEGIN
  IF _user_id IS NULL OR _studio_id IS NULL THEN RETURN false; END IF;

  SELECT role, permissions INTO _role, _perms
  FROM public.studio_members
  WHERE studio_id = _studio_id AND user_id = _user_id AND status = 'active'
  LIMIT 1;

  IF _role IS NULL THEN RETURN false; END IF;

  -- explicit jsonb grants only widen, never narrow
  IF COALESCE((_perms -> _capability)::text, '') = 'true' THEN RETURN true; END IF;

  RETURN CASE _capability
    WHEN 'manage_studio'   THEN _role IN ('owner','admin')
    WHEN 'manage_members'  THEN _role IN ('owner','admin')
    WHEN 'manage_equipment' THEN _role IN ('owner','admin','manager','staff')
    WHEN 'manage_portfolio' THEN _role IN ('owner','admin','manager','staff','contributor')
    WHEN 'delete_portfolio' THEN _role IN ('owner','admin','manager')
    WHEN 'delete_equipment' THEN _role IN ('owner','admin','manager')
    WHEN 'request_verification' THEN _role IN ('owner','admin')
    WHEN 'view_analytics'  THEN _role IN ('owner','admin','manager')
    WHEN 'delete_studio'   THEN _role = 'owner'
    ELSE false
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.is_studio_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.studio_role_of(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_studio_capability(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_studio_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.studio_role_of(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_studio_capability(uuid, uuid, text) TO authenticated, service_role;

-- ============ STUDIOS / MEMBERS POLICIES ============
CREATE POLICY "Members can view their studios" ON public.studios FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_studio_member(auth.uid(), id));
CREATE POLICY "Admins can view all studios" ON public.studios FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'master_admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Owners create their studio" ON public.studios FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Capable members update studio" ON public.studios FOR UPDATE TO authenticated
  USING (public.has_studio_capability(auth.uid(), id, 'manage_studio'))
  WITH CHECK (public.has_studio_capability(auth.uid(), id, 'manage_studio'));
CREATE POLICY "Owner deletes studio" ON public.studios FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Members view roster" ON public.studio_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_studio_member(auth.uid(), studio_id));
CREATE POLICY "Capable members add roster rows" ON public.studio_members FOR INSERT TO authenticated
  WITH CHECK (
    public.has_studio_capability(auth.uid(), studio_id, 'manage_members')
    OR EXISTS (SELECT 1 FROM public.studios s WHERE s.id = studio_id AND s.owner_id = auth.uid())
  );
CREATE POLICY "Capable members update roster" ON public.studio_members FOR UPDATE TO authenticated
  USING (public.has_studio_capability(auth.uid(), studio_id, 'manage_members'))
  WITH CHECK (public.has_studio_capability(auth.uid(), studio_id, 'manage_members'));
CREATE POLICY "Capable members remove roster" ON public.studio_members FOR DELETE TO authenticated
  USING (
    (public.has_studio_capability(auth.uid(), studio_id, 'manage_members') AND role <> 'owner')
    OR (user_id = auth.uid() AND role <> 'owner')
  );

-- ============ STUDIO INVITES ============
CREATE TABLE public.studio_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  invited_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.studio_role NOT NULL DEFAULT 'staff',
  title text,
  message text,
  status text NOT NULL DEFAULT 'pending',
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT studio_invites_status_check CHECK (status IN ('pending','accepted','declined','cancelled'))
);
CREATE UNIQUE INDEX studio_invites_pending_key ON public.studio_invites (studio_id, invited_user_id) WHERE status = 'pending';
CREATE INDEX idx_studio_invites_invited_user ON public.studio_invites (invited_user_id, status);
CREATE INDEX idx_studio_invites_studio_id ON public.studio_invites (studio_id);
CREATE INDEX idx_studio_invites_invited_by ON public.studio_invites (invited_by);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_invites TO authenticated;
GRANT ALL ON public.studio_invites TO service_role;
ALTER TABLE public.studio_invites ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_studio_invites_updated_at BEFORE UPDATE ON public.studio_invites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Invitee and managers view invites" ON public.studio_invites FOR SELECT TO authenticated
  USING (invited_user_id = auth.uid() OR public.has_studio_capability(auth.uid(), studio_id, 'manage_members'));
CREATE POLICY "Managers create invites" ON public.studio_invites FOR INSERT TO authenticated
  WITH CHECK (invited_by = auth.uid() AND public.has_studio_capability(auth.uid(), studio_id, 'manage_members'));
CREATE POLICY "Invitee responds or manager cancels" ON public.studio_invites FOR UPDATE TO authenticated
  USING (invited_user_id = auth.uid() OR public.has_studio_capability(auth.uid(), studio_id, 'manage_members'))
  WITH CHECK (invited_user_id = auth.uid() OR public.has_studio_capability(auth.uid(), studio_id, 'manage_members'));
CREATE POLICY "Managers delete invites" ON public.studio_invites FOR DELETE TO authenticated
  USING (public.has_studio_capability(auth.uid(), studio_id, 'manage_members'));

-- notification on invite
CREATE OR REPLACE FUNCTION public.notify_studio_invite()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _studio_name text; _handle text;
BEGIN
  SELECT name, handle INTO _studio_name, _handle FROM public.studios WHERE id = NEW.studio_id;
  INSERT INTO public.user_notifications (user_id, type, title, message, data)
  VALUES (
    NEW.invited_user_id,
    'studio_invite',
    'Studio invitation',
    COALESCE(_studio_name, 'A studio') || ' invited you to join as ' || NEW.role::text,
    jsonb_build_object('invite_id', NEW.id, 'studio_id', NEW.studio_id, 'studio_handle', _handle, 'role', NEW.role)
  );
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_studio_invite() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_notify_studio_invite AFTER INSERT ON public.studio_invites
  FOR EACH ROW WHEN (NEW.status = 'pending') EXECUTE FUNCTION public.notify_studio_invite();

-- accepting an invite creates the roster row
CREATE OR REPLACE FUNCTION public.handle_studio_invite_response()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    IF NEW.invited_user_id <> auth.uid() AND auth.uid() IS NOT NULL THEN
      RAISE EXCEPTION 'Only the invited user can accept this invitation' USING ERRCODE = '42501';
    END IF;
    INSERT INTO public.studio_members (studio_id, user_id, role, title)
    VALUES (NEW.studio_id, NEW.invited_user_id, NEW.role, NEW.title)
    ON CONFLICT (studio_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = 'active';
    NEW.responded_at = now();
  ELSIF NEW.status IN ('declined','cancelled') AND OLD.status = 'pending' THEN
    NEW.responded_at = now();
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_studio_invite_response() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_handle_studio_invite_response BEFORE UPDATE ON public.studio_invites
  FOR EACH ROW EXECUTE FUNCTION public.handle_studio_invite_response();

-- ============ STUDIO EQUIPMENT ============
CREATE TABLE public.studio_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  brand text,
  model text,
  description text,
  photo_url text,
  quantity integer NOT NULL DEFAULT 1,
  is_available boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT studio_equipment_quantity_check CHECK (quantity > 0)
);
CREATE INDEX idx_studio_equipment_studio_id ON public.studio_equipment (studio_id);
CREATE INDEX idx_studio_equipment_created_by ON public.studio_equipment (created_by);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_equipment TO authenticated;
GRANT ALL ON public.studio_equipment TO service_role;
ALTER TABLE public.studio_equipment ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_studio_equipment_updated_at BEFORE UPDATE ON public.studio_equipment
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Members view equipment" ON public.studio_equipment FOR SELECT TO authenticated
  USING (public.is_studio_member(auth.uid(), studio_id));
CREATE POLICY "Capable members add equipment" ON public.studio_equipment FOR INSERT TO authenticated
  WITH CHECK (public.has_studio_capability(auth.uid(), studio_id, 'manage_equipment'));
CREATE POLICY "Capable members update equipment" ON public.studio_equipment FOR UPDATE TO authenticated
  USING (public.has_studio_capability(auth.uid(), studio_id, 'manage_equipment'))
  WITH CHECK (public.has_studio_capability(auth.uid(), studio_id, 'manage_equipment'));
CREATE POLICY "Capable members delete equipment" ON public.studio_equipment FOR DELETE TO authenticated
  USING (public.has_studio_capability(auth.uid(), studio_id, 'delete_equipment'));

-- ============ STUDIO FOLLOWS ============
CREATE TABLE public.studio_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'follow',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (studio_id, user_id, kind),
  CONSTRAINT studio_follows_kind_check CHECK (kind IN ('follow','save'))
);
CREATE INDEX idx_studio_follows_user_id ON public.studio_follows (user_id);
CREATE INDEX idx_studio_follows_studio_id ON public.studio_follows (studio_id);

GRANT SELECT, INSERT, DELETE ON public.studio_follows TO authenticated;
GRANT ALL ON public.studio_follows TO service_role;
ALTER TABLE public.studio_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own follows" ON public.studio_follows FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_studio_member(auth.uid(), studio_id));
CREATE POLICY "Users create own follows" ON public.studio_follows FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users remove own follows" ON public.studio_follows FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============ PORTFOLIO OWNERSHIP WIDENING ============
ALTER TABLE public.portfolio_items ADD COLUMN studio_id uuid REFERENCES public.studios(id) ON DELETE CASCADE;
CREATE INDEX idx_portfolio_items_studio_id ON public.portfolio_items (studio_id);

CREATE POLICY "Capable members manage studio portfolio" ON public.portfolio_items FOR ALL TO authenticated
  USING (studio_id IS NOT NULL AND public.has_studio_capability(auth.uid(), studio_id, 'manage_portfolio'))
  WITH CHECK (studio_id IS NOT NULL AND public.has_studio_capability(auth.uid(), studio_id, 'manage_portfolio'));

-- ============ VERIFICATION REUSE ============
ALTER TABLE public.verification_requests DROP CONSTRAINT verification_requests_request_type_check;
ALTER TABLE public.verification_requests ADD CONSTRAINT verification_requests_request_type_check
  CHECK (request_type = ANY (ARRAY['artist','producer','label','identity','professional','portfolio','studio']));

-- ============ PUBLIC READ RPCs ============
CREATE OR REPLACE FUNCTION public.get_public_studio(_handle text)
RETURNS TABLE (
  id uuid, handle text, name text, org_type text, tagline text, bio text,
  logo_url text, cover_url text, primary_city text, primary_country text,
  latitude double precision, longitude double precision, contact_email text,
  social_links jsonb, facilities text[], is_verified boolean, created_at timestamptz,
  member_count bigint
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.handle, s.name, s.org_type::text, s.tagline, s.bio, s.logo_url, s.cover_url,
         s.primary_city, s.primary_country, s.latitude, s.longitude, s.contact_email,
         s.social_links, s.facilities, s.is_verified, s.created_at,
         (SELECT count(*) FROM public.studio_members m WHERE m.studio_id = s.id AND m.status = 'active')
  FROM public.studios s
  WHERE lower(s.handle) = lower(_handle)
    AND s.is_active AND NOT s.is_hidden AND s.visibility = 'public'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.list_public_studios(_city text DEFAULT NULL, _org_type text DEFAULT NULL, _search text DEFAULT NULL, _limit integer DEFAULT 24, _offset integer DEFAULT 0)
RETURNS TABLE (
  id uuid, handle text, name text, org_type text, tagline text, logo_url text, cover_url text,
  primary_city text, primary_country text, facilities text[], is_verified boolean, created_at timestamptz
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.handle, s.name, s.org_type::text, s.tagline, s.logo_url, s.cover_url,
         s.primary_city, s.primary_country, s.facilities, s.is_verified, s.created_at
  FROM public.studios s
  WHERE s.is_active AND NOT s.is_hidden AND s.visibility = 'public'
    AND (_city IS NULL OR lower(s.primary_city) = lower(_city))
    AND (_org_type IS NULL OR s.org_type::text = _org_type)
    AND (_search IS NULL OR s.name ILIKE '%' || _search || '%' OR s.handle ILIKE '%' || _search || '%' OR COALESCE(s.tagline,'') ILIKE '%' || _search || '%')
  ORDER BY s.is_verified DESC, s.created_at DESC
  LIMIT LEAST(COALESCE(_limit, 24), 100) OFFSET GREATEST(COALESCE(_offset, 0), 0);
$$;

CREATE OR REPLACE FUNCTION public.get_nearby_studios(_lat double precision, _lng double precision, _radius_km double precision DEFAULT 100, _limit integer DEFAULT 20)
RETURNS TABLE (
  id uuid, handle text, name text, tagline text, logo_url text, primary_city text,
  primary_country text, is_verified boolean, distance_km double precision
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.handle, s.name, s.tagline, s.logo_url, s.primary_city, s.primary_country, s.is_verified,
         (6371 * acos(LEAST(1, GREATEST(-1,
            cos(radians(_lat)) * cos(radians(s.latitude)) * cos(radians(s.longitude) - radians(_lng))
            + sin(radians(_lat)) * sin(radians(s.latitude))
         )))) AS distance_km
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

CREATE OR REPLACE FUNCTION public.list_studio_public_portfolio(_studio_id uuid, _limit integer DEFAULT 24)
RETURNS TABLE (id uuid, title text, description text, media_type text, media_url text, thumbnail_url text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.title, p.description, p.media_type, p.media_url, p.thumbnail_url, p.created_at
  FROM public.portfolio_items p
  JOIN public.studios s ON s.id = p.studio_id
  WHERE p.studio_id = _studio_id AND COALESCE(p.is_hidden, false) = false
    AND s.is_active AND NOT s.is_hidden AND s.visibility = 'public'
  ORDER BY p.created_at DESC
  LIMIT LEAST(COALESCE(_limit, 24), 100);
$$;

CREATE OR REPLACE FUNCTION public.list_studio_public_equipment(_studio_id uuid, _limit integer DEFAULT 50)
RETURNS TABLE (id uuid, name text, category text, brand text, model text, description text, photo_url text, quantity integer, is_available boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.id, e.name, e.category, e.brand, e.model, e.description, e.photo_url, e.quantity, e.is_available
  FROM public.studio_equipment e
  JOIN public.studios s ON s.id = e.studio_id
  WHERE e.studio_id = _studio_id
    AND s.is_active AND NOT s.is_hidden AND s.visibility = 'public'
  ORDER BY e.created_at DESC
  LIMIT LEAST(COALESCE(_limit, 50), 200);
$$;

CREATE OR REPLACE FUNCTION public.list_studio_public_team(_studio_id uuid, _limit integer DEFAULT 50)
RETURNS TABLE (user_id uuid, full_name text, username text, avatar_url text, is_verified boolean, role text, title text, creative_roles text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.user_id, pr.full_name, pr.username, pr.avatar_url, pr.is_verified,
         m.role::text, m.title, ARRAY(SELECT cr::text FROM unnest(m.creative_roles) cr)
  FROM public.studio_members m
  JOIN public.studios s ON s.id = m.studio_id
  JOIN public.profiles pr ON pr.id = m.user_id
  WHERE m.studio_id = _studio_id AND m.status = 'active'
    AND s.is_active AND NOT s.is_hidden AND s.visibility = 'public'
  ORDER BY m.role, m.created_at
  LIMIT LEAST(COALESCE(_limit, 50), 200);
$$;

GRANT EXECUTE ON FUNCTION public.get_public_studio(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_public_studios(text, text, text, integer, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_nearby_studios(double precision, double precision, double precision, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_studio_public_portfolio(uuid, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_studio_public_equipment(uuid, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_studio_public_team(uuid, integer) TO anon, authenticated, service_role;

-- ============ STORAGE: shared studio media folder in the portfolios bucket ============
CREATE POLICY "Studio members upload studio media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'portfolios'
    AND (storage.foldername(name))[1] = 'studios'
    AND public.is_studio_member(auth.uid(), ((storage.foldername(name))[2])::uuid)
  );
CREATE POLICY "Studio members update studio media" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'portfolios'
    AND (storage.foldername(name))[1] = 'studios'
    AND public.is_studio_member(auth.uid(), ((storage.foldername(name))[2])::uuid)
  );
CREATE POLICY "Studio members delete studio media" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'portfolios'
    AND (storage.foldername(name))[1] = 'studios'
    AND public.is_studio_member(auth.uid(), ((storage.foldername(name))[2])::uuid)
  );