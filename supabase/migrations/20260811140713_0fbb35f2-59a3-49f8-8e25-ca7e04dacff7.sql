
-- ============ 1. PUBLIC IDENTITY ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nickname text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS display_name_mode text NOT NULL DEFAULT 'full_name',
  ADD COLUMN IF NOT EXISTS username_changed_at timestamptz;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_display_name_mode_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_display_name_mode_check
  CHECK (display_name_mode IN ('full_name','nickname','username','full_and_nickname','custom'));

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_key ON public.profiles (lower(username));

CREATE TABLE IF NOT EXISTS public.reserved_usernames (
  username text PRIMARY KEY,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reserved_usernames TO authenticated;
GRANT ALL ON public.reserved_usernames TO service_role;
ALTER TABLE public.reserved_usernames ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reserved usernames readable by members" ON public.reserved_usernames
  FOR SELECT TO authenticated USING (true);

INSERT INTO public.reserved_usernames(username, reason) VALUES
  ('admin','reserved'),('administrator','reserved'),('support','reserved'),('help','reserved'),
  ('artistrysynk','brand'),('synk','brand'),('official','reserved'),('team','reserved'),
  ('security','reserved'),('moderator','reserved'),('staff','reserved'),('root','reserved'),
  ('api','reserved'),('www','reserved'),('billing','reserved'),('legal','reserved'),
  ('privacy','reserved'),('verify','reserved'),('verified','reserved'),('studio','reserved')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.username_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  old_username text NOT NULL,
  new_username text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS username_history_user_idx ON public.username_history(user_id);
GRANT SELECT ON public.username_history TO authenticated;
GRANT ALL ON public.username_history TO service_role;
ALTER TABLE public.username_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own username history" ON public.username_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.normalize_username(_raw text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT lower(regexp_replace(coalesce(_raw,''), '[^A-Za-z0-9_]', '', 'g'))
$$;

CREATE OR REPLACE FUNCTION public.guard_username_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.username IS DISTINCT FROM OLD.username THEN
    IF length(coalesce(public.normalize_username(NEW.username),'')) < 3 THEN
      RAISE EXCEPTION 'Username must be at least 3 characters (letters, numbers, underscore)';
    END IF;
    IF EXISTS (SELECT 1 FROM public.reserved_usernames r WHERE r.username = lower(NEW.username)) THEN
      RAISE EXCEPTION 'That username is reserved';
    END IF;
    IF OLD.username_changed_at IS NOT NULL AND OLD.username_changed_at > now() - interval '30 days' THEN
      RAISE EXCEPTION 'You can only change your username once every 30 days';
    END IF;
    INSERT INTO public.username_history(user_id, old_username, new_username)
      VALUES (OLD.id, OLD.username, NEW.username);
    NEW.username_changed_at := now();
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_username_change ON public.profiles;
CREATE TRIGGER trg_guard_username_change BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_username_change();

-- ============ 2. LEGAL IDENTITY VAULT ============
CREATE TABLE IF NOT EXISTS public.identity_profiles (
  user_id uuid PRIMARY KEY,
  legal_name text,
  legal_country text,
  date_of_birth date,
  verification_status text NOT NULL DEFAULT 'unverified',
  verification_level text NOT NULL DEFAULT 'standard',
  verified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT identity_status_check CHECK (verification_status IN ('unverified','pending','verified','failed','expired','restricted')),
  CONSTRAINT identity_level_check CHECK (verification_level IN ('standard','identity_verified','studio_verified','entity_verified'))
);
GRANT SELECT, INSERT, UPDATE ON public.identity_profiles TO authenticated;
GRANT ALL ON public.identity_profiles TO service_role;
ALTER TABLE public.identity_profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_identity_officer(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('compliance_admin','super_admin','master_admin')
  )
$$;
REVOKE ALL ON FUNCTION public.is_identity_officer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_identity_officer(uuid) TO authenticated, service_role;

CREATE POLICY "Own identity record" ON public.identity_profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_identity_officer(auth.uid()));
CREATE POLICY "Create own identity record" ON public.identity_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own identity record" ON public.identity_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.identity_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL DEFAULT 'user',
  subject_id uuid NOT NULL,
  requested_by uuid,
  provider text,
  document_type text,
  issuing_country text,
  verification_reference text,
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  expires_at timestamptz,
  notes text,
  CONSTRAINT identity_verifications_subject_check CHECK (subject_type IN ('user','studio','entity')),
  CONSTRAINT identity_verifications_status_check CHECK (status IN ('pending','verified','failed','expired','restricted'))
);
CREATE INDEX IF NOT EXISTS identity_verifications_subject_idx ON public.identity_verifications(subject_type, subject_id);
GRANT SELECT, INSERT ON public.identity_verifications TO authenticated;
GRANT ALL ON public.identity_verifications TO service_role;
ALTER TABLE public.identity_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or officer verification records" ON public.identity_verifications
  FOR SELECT TO authenticated
  USING ((subject_type = 'user' AND subject_id = auth.uid()) OR requested_by = auth.uid() OR public.is_identity_officer(auth.uid()));
CREATE POLICY "Request own verification" ON public.identity_verifications
  FOR INSERT TO authenticated
  WITH CHECK (requested_by = auth.uid() AND status = 'pending');

CREATE TABLE IF NOT EXISTS public.identity_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accessor_id uuid NOT NULL,
  subject_user_id uuid NOT NULL,
  reason text,
  accessed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS identity_access_logs_subject_idx ON public.identity_access_logs(subject_user_id);
GRANT SELECT ON public.identity_access_logs TO authenticated;
GRANT ALL ON public.identity_access_logs TO service_role;
ALTER TABLE public.identity_access_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Officers read identity access log" ON public.identity_access_logs
  FOR SELECT TO authenticated USING (public.is_identity_officer(auth.uid()) OR subject_user_id = auth.uid());

-- Officer-only accessor that records every read of legal identity data.
CREATE OR REPLACE FUNCTION public.get_identity_record(_subject uuid, _reason text)
RETURNS TABLE(user_id uuid, legal_name text, legal_country text, verification_status text, verification_level text, verified_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_identity_officer(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorised to read identity records';
  END IF;
  INSERT INTO public.identity_access_logs(accessor_id, subject_user_id, reason)
    VALUES (auth.uid(), _subject, coalesce(_reason, 'unspecified'));
  RETURN QUERY
    SELECT i.user_id, i.legal_name, i.legal_country, i.verification_status, i.verification_level, i.verified_at
    FROM public.identity_profiles i WHERE i.user_id = _subject;
END;
$$;
REVOKE ALL ON FUNCTION public.get_identity_record(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_identity_record(uuid, text) TO authenticated, service_role;

-- ============ 3. VISIBILITY + DISCOVERY PERMISSIONS ============
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS visibility_mode text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS who_can_discover text NOT NULL DEFAULT 'everyone',
  ADD COLUMN IF NOT EXISTS who_can_match text NOT NULL DEFAULT 'everyone',
  ADD COLUMN IF NOT EXISTS who_can_contact text NOT NULL DEFAULT 'matches',
  ADD COLUMN IF NOT EXISTS who_can_scout text NOT NULL DEFAULT 'verified',
  ADD COLUMN IF NOT EXISTS who_can_introduce text NOT NULL DEFAULT 'trusted',
  ADD COLUMN IF NOT EXISTS open_to_opportunities boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS opportunity_types text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS allow_search_indexing boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS anonymous_talent_profile boolean NOT NULL DEFAULT false;

ALTER TABLE public.user_settings DROP CONSTRAINT IF EXISTS user_settings_visibility_mode_check;
ALTER TABLE public.user_settings ADD CONSTRAINT user_settings_visibility_mode_check
  CHECK (visibility_mode IN ('public','discoverable','private','invisible'));

-- ============ 4. TRUSTED CIRCLE ============
CREATE TABLE IF NOT EXISTS public.trusted_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  related_user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'connection',
  status text NOT NULL DEFAULT 'pending',
  source text NOT NULL DEFAULT 'direct',
  introduced_by uuid,
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trusted_self_check CHECK (user_id <> related_user_id),
  CONSTRAINT trusted_kind_check CHECK (kind IN ('connection','friend','collaborator','studio','match','referral','introduction')),
  CONSTRAINT trusted_status_check CHECK (status IN ('pending','accepted','declined','revoked')),
  CONSTRAINT trusted_source_check CHECK (source IN ('direct','match','friend','collaborator','referral','trusted_introduction')),
  CONSTRAINT trusted_unique UNIQUE (user_id, related_user_id)
);
CREATE INDEX IF NOT EXISTS trusted_relationships_related_idx ON public.trusted_relationships(related_user_id);
CREATE INDEX IF NOT EXISTS trusted_relationships_introducer_idx ON public.trusted_relationships(introduced_by);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trusted_relationships TO authenticated;
GRANT ALL ON public.trusted_relationships TO service_role;
ALTER TABLE public.trusted_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "See own trusted relationships" ON public.trusted_relationships
  FOR SELECT TO authenticated
  USING (auth.uid() IN (user_id, related_user_id, introduced_by));
CREATE POLICY "Request trust" ON public.trusted_relationships
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = related_user_id
    OR (auth.uid() = introduced_by AND source = 'trusted_introduction' AND status = 'pending')
  );
CREATE POLICY "Owner decides trust" ON public.trusted_relationships
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner or requester removes trust" ON public.trusted_relationships
  FOR DELETE TO authenticated USING (auth.uid() IN (user_id, related_user_id));

CREATE OR REPLACE FUNCTION public.touch_trusted_relationship()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status IS DISTINCT FROM OLD.status THEN NEW.responded_at := now(); END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_touch_trusted ON public.trusted_relationships;
CREATE TRIGGER trg_touch_trusted BEFORE UPDATE ON public.trusted_relationships
  FOR EACH ROW EXECUTE FUNCTION public.touch_trusted_relationship();

-- ============ 5. CORE VISIBILITY ENGINE ============
CREATE OR REPLACE FUNCTION public.is_trusted_by(_owner uuid, _other uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trusted_relationships t
    WHERE t.status = 'accepted'
      AND ((t.user_id = _owner AND t.related_user_id = _other)
        OR (t.user_id = _other AND t.related_user_id = _owner))
  )
$$;

CREATE OR REPLACE FUNCTION public.has_existing_relationship(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _a IS NOT NULL AND _b IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.matches m
            WHERE (m.user_id_1 = _a AND m.user_id_2 = _b) OR (m.user_id_1 = _b AND m.user_id_2 = _a))
    OR public.is_trusted_by(_a, _b)
    OR EXISTS (SELECT 1 FROM public.project_members p1
               JOIN public.project_members p2 ON p2.project_id = p1.project_id
               WHERE p1.user_id = _a AND p2.user_id = _b)
    OR EXISTS (SELECT 1 FROM public.studio_members s1
               JOIN public.studio_members s2 ON s2.studio_id = s1.studio_id
               WHERE s1.user_id = _a AND s2.user_id = _b
                 AND s1.status = 'active' AND s2.status = 'active')
  )
$$;

-- Audience test for a permission choice.
CREATE OR REPLACE FUNCTION public.audience_allows(_choice text, _owner uuid, _viewer uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE coalesce(_choice, 'everyone')
    WHEN 'nobody' THEN false
    WHEN 'everyone' THEN true
    WHEN 'members' THEN _viewer IS NOT NULL
    WHEN 'matches' THEN EXISTS (SELECT 1 FROM public.matches m
        WHERE (m.user_id_1 = _owner AND m.user_id_2 = _viewer) OR (m.user_id_1 = _viewer AND m.user_id_2 = _owner))
    WHEN 'trusted' THEN public.is_trusted_by(_owner, _viewer)
    WHEN 'connections' THEN public.has_existing_relationship(_owner, _viewer)
    WHEN 'verified' THEN EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _viewer AND p.is_verified = true)
      OR EXISTS (SELECT 1 FROM public.identity_profiles i WHERE i.user_id = _viewer AND i.verification_status = 'verified')
    WHEN 'studios' THEN EXISTS (SELECT 1 FROM public.studio_members sm
        WHERE sm.user_id = _viewer AND sm.status = 'active')
    ELSE _viewer IS NOT NULL
  END
$$;

-- Can _viewer discover _target on a given surface?
CREATE OR REPLACE FUNCTION public.can_discover(_viewer uuid, _target uuid, _surface text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  s public.user_settings%ROWTYPE;
  hidden boolean;
  mode text;
BEGIN
  IF _target IS NULL THEN RETURN false; END IF;
  IF _viewer = _target THEN RETURN true; END IF;

  SELECT coalesce(p.is_hidden, false) INTO hidden FROM public.profiles p WHERE p.id = _target;
  IF hidden IS NULL OR hidden THEN RETURN false; END IF;

  IF _viewer IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.blocked_users b
    WHERE (b.blocker_id = _viewer AND b.blocked_id = _target)
       OR (b.blocker_id = _target AND b.blocked_id = _viewer)
  ) THEN RETURN false; END IF;

  SELECT * INTO s FROM public.user_settings WHERE user_id = _target;
  mode := coalesce(s.visibility_mode, 'public');

  IF mode = 'invisible' THEN
    RETURN _viewer IS NOT NULL AND public.is_trusted_by(_target, _viewer);
  END IF;
  IF mode = 'private' THEN
    RETURN _viewer IS NOT NULL AND public.has_existing_relationship(_target, _viewer);
  END IF;

  -- surface level switches
  IF _surface = 'discovery' AND NOT coalesce(s.discoverable_in_discovery, true) THEN RETURN false; END IF;
  IF _surface = 'search' AND NOT coalesce(s.discoverable_in_search, true) THEN RETURN false; END IF;
  IF _surface = 'recommendations' AND NOT coalesce(s.discoverable_in_recommendations, true) THEN RETURN false; END IF;
  IF _surface = 'talent' THEN
    IF NOT coalesce(s.open_to_opportunities, false) THEN RETURN false; END IF;
    RETURN public.audience_allows(coalesce(s.who_can_scout,'verified'), _target, _viewer);
  END IF;
  IF _surface = 'web' THEN
    RETURN mode = 'public' AND coalesce(s.allow_search_indexing, true);
  END IF;

  IF mode = 'discoverable' AND _viewer IS NULL THEN RETURN false; END IF;

  RETURN public.audience_allows(coalesce(s.who_can_discover,'everyone'), _target, _viewer);
END;
$$;

CREATE OR REPLACE FUNCTION public.can_match_with(_viewer uuid, _target uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _viewer IS NOT NULL AND _target IS NOT NULL AND _viewer <> _target
    AND public.can_discover(_viewer, _target, 'discovery')
    AND public.audience_allows(
      coalesce((SELECT who_can_match FROM public.user_settings WHERE user_id = _target), 'everyone'),
      _target, _viewer)
$$;

CREATE OR REPLACE FUNCTION public.can_contact_user(_viewer uuid, _target uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _viewer IS NOT NULL AND _target IS NOT NULL AND (
    _viewer = _target OR public.audience_allows(
      coalesce((SELECT who_can_contact FROM public.user_settings WHERE user_id = _target), 'matches'),
      _target, _viewer)
  )
$$;

-- RLS predicate for the profiles table.
CREATE OR REPLACE FUNCTION public.profile_visible_to(_viewer uuid, _target uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT
    _viewer = _target
    OR (_viewer IS NOT NULL AND (
      public.has_role(_viewer, 'admin') OR public.has_role(_viewer, 'master_admin')
      OR public.has_role(_viewer, 'super_admin') OR public.has_role(_viewer, 'moderator')
      OR public.has_existing_relationship(_viewer, _target)
      OR EXISTS (SELECT 1 FROM public.conversations c
                 WHERE c.customer_id = _viewer AND c.studio_id IS NOT NULL)
    ))
    OR public.can_discover(_viewer, _target, 'search')
$$;
REVOKE ALL ON FUNCTION public.profile_visible_to(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profile_visible_to(uuid, uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Profiles are viewable based on role visibility" ON public.profiles;
CREATE POLICY "Profiles are viewable based on visibility rules" ON public.profiles
  FOR SELECT USING (public.can_see_user(auth.uid(), id) AND public.profile_visible_to(auth.uid(), id));

-- Swipes may only target people who allow matching.
CREATE OR REPLACE FUNCTION public.guard_swipe_privacy()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.can_match_with(NEW.swiper_id, NEW.swiped_id) THEN
    RAISE EXCEPTION 'This creative is not available for matching';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_swipe_privacy ON public.swipes;
CREATE TRIGGER trg_guard_swipe_privacy BEFORE INSERT ON public.swipes
  FOR EACH ROW EXECUTE FUNCTION public.guard_swipe_privacy();

-- ============ 6. PUBLIC / WEB SURFACES RESPECT VISIBILITY ============
CREATE OR REPLACE FUNCTION public.get_public_profile(_identifier text)
RETURNS TABLE(id uuid, full_name text, username text, bio text, location text, city text, country text, avatar_url text, cover_image_url text, social_links jsonb, is_verified boolean, created_at timestamptz, roles text[], genres text[], skills text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT
    p.id,
    CASE coalesce(p.display_name_mode,'full_name')
      WHEN 'username' THEN '@' || p.username
      WHEN 'nickname' THEN coalesce(p.nickname, p.full_name)
      WHEN 'custom' THEN coalesce(p.display_name, p.full_name)
      WHEN 'full_and_nickname' THEN p.full_name || coalesce(' “' || p.nickname || '”', '')
      ELSE p.full_name
    END,
    p.username, p.bio, p.location, p.city, p.country, p.avatar_url, p.cover_image_url,
    p.social_links, p.is_verified, p.created_at,
    COALESCE((SELECT array_agg(r.role::text ORDER BY r.role::text) FROM public.user_creative_roles r WHERE r.user_id = p.id), '{}')::text[],
    COALESCE((SELECT array_agg(g.genre::text ORDER BY g.genre::text) FROM public.user_genres g WHERE g.user_id = p.id), '{}')::text[],
    COALESCE((SELECT array_agg(t.skill ORDER BY t.skill) FROM public.user_skill_tags t WHERE t.user_id = p.id), '{}')::text[]
  FROM public.profiles p
  LEFT JOIN public.user_settings s ON s.user_id = p.id
  WHERE COALESCE(p.is_hidden, false) = false
    AND COALESCE(s.profile_visibility, 'public') = 'public'
    AND COALESCE(s.visibility_mode, 'public') = 'public'
    AND COALESCE(s.allow_search_indexing, true) = true
    AND (lower(p.username) = lower(_identifier) OR p.id::text = _identifier)
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.list_public_locations(_min_creators integer DEFAULT 1)
RETURNS TABLE(city text, country text, creator_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT p.city, MAX(p.country) AS country, COUNT(*) AS creator_count
  FROM public.profiles p
  LEFT JOIN public.user_settings s ON s.user_id = p.id
  WHERE COALESCE(p.is_hidden, false) = false
    AND COALESCE(s.profile_visibility, 'public') = 'public'
    AND COALESCE(s.visibility_mode, 'public') = 'public'
    AND COALESCE(s.discoverable_in_search, true) = true
    AND p.city IS NOT NULL AND length(trim(p.city)) > 0
  GROUP BY p.city
  HAVING COUNT(*) >= GREATEST(COALESCE(_min_creators, 1), 1)
  ORDER BY COUNT(*) DESC, p.city ASC;
$$;

CREATE OR REPLACE FUNCTION public.get_nearby_creators(_user_id uuid, _lat double precision, _lng double precision, _radius_km double precision DEFAULT 100, _limit integer DEFAULT 20)
RETURNS TABLE(id uuid, full_name text, username text, avatar_url text, location text, city text, country text, bio text, is_verified boolean, latitude double precision, longitude double precision, distance_km double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT
    p.id, p.full_name, p.username, p.avatar_url, p.location, p.city, p.country, p.bio, p.is_verified,
    CASE WHEN COALESCE(s.location_precision, 'city') = 'precise' THEN p.latitude ELSE NULL END,
    CASE WHEN COALESCE(s.location_precision, 'city') = 'precise' THEN p.longitude ELSE NULL END,
    (6371 * acos(LEAST(1.0, cos(radians(_lat)) * cos(radians(p.latitude)) *
      cos(radians(p.longitude) - radians(_lng)) + sin(radians(_lat)) * sin(radians(p.latitude))))) AS distance_km
  FROM public.profiles p
  LEFT JOIN public.user_settings s ON s.user_id = p.id
  WHERE p.id <> _user_id
    AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
    AND p.is_hidden IS NOT TRUE
    AND COALESCE(s.location_precision, 'city') <> 'off'
    AND public.can_discover(auth.uid(), p.id, 'search')
    AND (6371 * acos(LEAST(1.0, cos(radians(_lat)) * cos(radians(p.latitude)) *
      cos(radians(p.longitude) - radians(_lng)) + sin(radians(_lat)) * sin(radians(p.latitude))))) <= _radius_km
  ORDER BY distance_km ASC
  LIMIT _limit;
$$;

-- ============ 7. TALENT DISCOVERY (ANONYMISED) ============
CREATE OR REPLACE FUNCTION public.list_talent_candidates(
  _role text DEFAULT NULL, _skill text DEFAULT NULL, _city text DEFAULT NULL,
  _verified_only boolean DEFAULT false, _opportunity text DEFAULT NULL,
  _limit integer DEFAULT 24, _offset integer DEFAULT 0)
RETURNS TABLE(reference text, user_id uuid, display_label text, avatar_url text, city text, country text,
              roles text[], skills text[], is_verified boolean, identity_verified boolean,
              opportunity_types text[], anonymous boolean, collaborations integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT
    'AS-' || upper(substr(md5(p.id::text), 1, 5)) AS reference,
    CASE WHEN coalesce(s.anonymous_talent_profile, false) THEN NULL ELSE p.id END,
    CASE WHEN coalesce(s.anonymous_talent_profile, false)
      THEN 'Creative ' || 'AS-' || upper(substr(md5(p.id::text), 1, 5))
      ELSE coalesce(p.display_name, p.nickname, p.full_name) END,
    CASE WHEN coalesce(s.anonymous_talent_profile, false) THEN NULL ELSE p.avatar_url END,
    p.city, p.country,
    COALESCE((SELECT array_agg(r.role::text ORDER BY r.role::text) FROM public.user_creative_roles r WHERE r.user_id = p.id), '{}')::text[],
    COALESCE((SELECT array_agg(t.skill ORDER BY t.skill) FROM public.user_skill_tags t WHERE t.user_id = p.id), '{}')::text[],
    p.is_verified,
    EXISTS (SELECT 1 FROM public.identity_profiles i WHERE i.user_id = p.id AND i.verification_status = 'verified'),
    coalesce(s.opportunity_types, '{}')::text[],
    coalesce(s.anonymous_talent_profile, false),
    (SELECT count(*)::int FROM public.creator_credits c WHERE c.user_id = p.id)
  FROM public.profiles p
  JOIN public.user_settings s ON s.user_id = p.id
  WHERE auth.uid() IS NOT NULL
    AND p.id <> auth.uid()
    AND public.can_discover(auth.uid(), p.id, 'talent')
    AND (_city IS NULL OR p.city ILIKE '%' || _city || '%' OR p.location ILIKE '%' || _city || '%')
    AND (_verified_only IS NOT TRUE OR p.is_verified = true)
    AND (_opportunity IS NULL OR _opportunity = ANY (s.opportunity_types))
    AND (_role IS NULL OR EXISTS (SELECT 1 FROM public.user_creative_roles r WHERE r.user_id = p.id AND r.role::text = _role))
    AND (_skill IS NULL OR EXISTS (SELECT 1 FROM public.user_skill_tags t WHERE t.user_id = p.id AND t.skill ILIKE '%' || _skill || '%'))
  ORDER BY p.is_verified DESC NULLS LAST, p.last_seen_at DESC NULLS LAST
  LIMIT LEAST(COALESCE(_limit, 24), 48) OFFSET GREATEST(COALESCE(_offset, 0), 0);
$$;
REVOKE ALL ON FUNCTION public.list_talent_candidates(text, text, text, boolean, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_talent_candidates(text, text, text, boolean, text, integer, integer) TO authenticated, service_role;

-- Ask an anonymous candidate for an introduction (creates a pending trusted request).
CREATE OR REPLACE FUNCTION public.request_introduction(_reference text, _message text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _target uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT p.id INTO _target FROM public.profiles p
    WHERE 'AS-' || upper(substr(md5(p.id::text), 1, 5)) = _reference
      AND public.can_discover(auth.uid(), p.id, 'talent')
    LIMIT 1;
  IF _target IS NULL THEN RAISE EXCEPTION 'Candidate not available'; END IF;

  INSERT INTO public.trusted_relationships(user_id, related_user_id, kind, status, source, message)
  VALUES (_target, auth.uid(), 'introduction', 'pending', 'direct', _message)
  ON CONFLICT (user_id, related_user_id) DO NOTHING;

  INSERT INTO public.user_notifications(user_id, type, title, body, link)
  VALUES (_target, 'introduction_request', 'New introduction request',
          'A scout would like to be introduced to you.', '/settings/privacy');
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.request_introduction(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_introduction(text, text) TO authenticated, service_role;

-- Grants for the new discovery helpers
REVOKE ALL ON FUNCTION public.can_discover(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_discover(uuid, uuid, text) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.audience_allows(text, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.audience_allows(text, uuid, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_trusted_by(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_trusted_by(uuid, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.has_existing_relationship(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_existing_relationship(uuid, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.can_match_with(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_match_with(uuid, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.can_contact_user(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_contact_user(uuid, uuid) TO authenticated, service_role;
