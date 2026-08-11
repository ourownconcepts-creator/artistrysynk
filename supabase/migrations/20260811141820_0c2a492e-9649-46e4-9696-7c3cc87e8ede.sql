
-- ============ A. CAPABILITY / VERIFICATION SERVICE ============
CREATE TABLE IF NOT EXISTS public.capability_requirements (
  capability text PRIMARY KEY,
  required_level text NOT NULL DEFAULT 'standard',
  enabled boolean NOT NULL DEFAULT true,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT capability_required_level_check
    CHECK (required_level IN ('standard','identity_verified','studio_verified','entity_verified'))
);
GRANT SELECT ON public.capability_requirements TO authenticated;
GRANT ALL ON public.capability_requirements TO service_role;
ALTER TABLE public.capability_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Capability requirements readable" ON public.capability_requirements
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Officers manage capability requirements" ON public.capability_requirements
  FOR ALL TO authenticated
  USING (public.is_identity_officer(auth.uid()))
  WITH CHECK (public.is_identity_officer(auth.uid()));

INSERT INTO public.capability_requirements(capability, required_level, enabled, description) VALUES
  ('studio_create','standard',true,'Create a studio, agency or label'),
  ('studio_verification','identity_verified',true,'Request the verified badge for a studio'),
  ('talent_scouting','standard',true,'Search talent who are open to opportunities'),
  ('payouts','identity_verified',true,'Receive marketplace payouts'),
  ('copyright_claim','identity_verified',true,'File a copyright claim'),
  ('entity_representation','entity_verified',true,'Represent a company or label entity')
ON CONFLICT (capability) DO NOTHING;

CREATE OR REPLACE FUNCTION public.verification_rank(_level text)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE coalesce(_level,'standard')
    WHEN 'entity_verified' THEN 3
    WHEN 'studio_verified' THEN 2
    WHEN 'identity_verified' THEN 1
    ELSE 0 END
$$;

CREATE OR REPLACE FUNCTION public.user_verification_level(_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT coalesce(
    (SELECT i.verification_level FROM public.identity_profiles i
       WHERE i.user_id = _user_id AND i.verification_status = 'verified'),
    'standard')
$$;

CREATE OR REPLACE FUNCTION public.requires_verification(_capability text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE WHEN c.enabled THEN c.required_level ELSE 'standard' END
  FROM public.capability_requirements c WHERE c.capability = _capability
$$;

CREATE OR REPLACE FUNCTION public.meets_verification(_user_id uuid, _capability text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _user_id IS NOT NULL AND public.verification_rank(public.user_verification_level(_user_id))
    >= public.verification_rank(coalesce(public.requires_verification(_capability), 'standard'))
$$;

-- What the signed-in member may do, for UI gating.
CREATE OR REPLACE FUNCTION public.my_capabilities()
RETURNS TABLE(capability text, required_level text, my_level text, allowed boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT c.capability,
         CASE WHEN c.enabled THEN c.required_level ELSE 'standard' END,
         public.user_verification_level(auth.uid()),
         public.meets_verification(auth.uid(), c.capability)
  FROM public.capability_requirements c
  WHERE auth.uid() IS NOT NULL
  ORDER BY c.capability
$$;

-- Trigger a verification review for a capability the caller cannot yet use.
CREATE OR REPLACE FUNCTION public.request_capability_verification(_capability text, _notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _level text; _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  _level := coalesce(public.requires_verification(_capability), 'standard');
  IF _level IS NULL THEN RAISE EXCEPTION 'Unknown capability'; END IF;

  INSERT INTO public.identity_profiles(user_id, verification_status, verification_level)
  VALUES (_uid, 'pending', 'standard')
  ON CONFLICT (user_id) DO UPDATE
    SET verification_status = CASE WHEN public.identity_profiles.verification_status = 'verified'
                                   THEN public.identity_profiles.verification_status ELSE 'pending' END,
        updated_at = now();

  INSERT INTO public.identity_verifications(subject_type, subject_id, requested_by, status, notes, document_type)
  VALUES ('user', _uid, _uid, 'pending', _notes, _capability)
  RETURNING id INTO _id;

  INSERT INTO public.admin_notifications(type, title, message, metadata)
  VALUES ('verification_request', 'Verification requested',
          'A member requested verification for ' || _capability,
          jsonb_build_object('user_id', _uid, 'capability', _capability, 'required_level', _level));

  RETURN _id;
END;
$$;
REVOKE ALL ON FUNCTION public.request_capability_verification(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_capability_verification(text, text) TO authenticated, service_role;

-- Studio creation now goes through the capability service.
CREATE OR REPLACE FUNCTION public.create_studio(_handle text, _name text, _org_type studio_org_type DEFAULT 'studio'::studio_org_type, _tagline text DEFAULT NULL::text, _bio text DEFAULT NULL::text, _primary_city text DEFAULT NULL::text, _primary_country text DEFAULT NULL::text, _contact_email text DEFAULT NULL::text, _facilities text[] DEFAULT '{}'::text[])
RETURNS TABLE(id uuid, handle text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  _uid uuid := auth.uid();
  _clean_handle text := lower(btrim(coalesce(_handle, '')));
  _clean_name text := btrim(coalesce(_name, ''));
  _studio_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  IF NOT public.has_studio_entitlement(_uid) THEN
    RAISE EXCEPTION 'A Studio plan is required to create a studio';
  END IF;

  IF NOT public.meets_verification(_uid, 'studio_create') THEN
    RAISE EXCEPTION 'Identity verification is required before creating a studio';
  END IF;

  IF length(_clean_name) < 2 THEN RAISE EXCEPTION 'Give your studio a name'; END IF;

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
$function$;

-- ============ B. TRUSTED INTRODUCTIONS ============
CREATE OR REPLACE FUNCTION public.create_trusted_introduction(_subject uuid, _recipient uuid, _message text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF _subject IS NULL OR _recipient IS NULL OR _subject = _recipient THEN
    RAISE EXCEPTION 'Pick two different people';
  END IF;
  IF _uid IN (_subject, _recipient) THEN
    RAISE EXCEPTION 'Introductions are made on behalf of two other people';
  END IF;

  -- The introducer must be trusted by the subject AND allowed to introduce them.
  IF NOT public.is_trusted_by(_subject, _uid) THEN
    RAISE EXCEPTION 'Only someone in their trusted circle can introduce them';
  END IF;
  IF NOT public.audience_allows(
       coalesce((SELECT who_can_introduce FROM public.user_settings WHERE user_id = _subject), 'trusted'),
       _subject, _uid) THEN
    RAISE EXCEPTION 'They do not allow introductions from you';
  END IF;
  IF EXISTS (SELECT 1 FROM public.blocked_users b
             WHERE (b.blocker_id = _subject AND b.blocked_id = _recipient)
                OR (b.blocker_id = _recipient AND b.blocked_id = _subject)) THEN
    RAISE EXCEPTION 'Introduction not available';
  END IF;

  INSERT INTO public.trusted_relationships(user_id, related_user_id, kind, status, source, introduced_by, message)
  VALUES (_subject, _recipient, 'introduction', 'pending', 'trusted_introduction', _uid, _message)
  ON CONFLICT (user_id, related_user_id) DO UPDATE
    SET status = CASE WHEN public.trusted_relationships.status = 'accepted' THEN 'accepted' ELSE 'pending' END,
        introduced_by = _uid,
        source = 'trusted_introduction',
        message = coalesce(_message, public.trusted_relationships.message),
        updated_at = now()
  RETURNING id INTO _id;

  INSERT INTO public.user_notifications(user_id, type, title, body, link)
  VALUES (_subject, 'trusted_introduction', 'You have an introduction to review',
          'Someone in your trusted circle wants to introduce you to another member.',
          '/settings');

  RETURN _id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_trusted_introduction(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_trusted_introduction(uuid, uuid, text) TO authenticated, service_role;

-- Accept / decline / revoke with notification back to the requester.
CREATE OR REPLACE FUNCTION public.respond_to_trust_request(_id uuid, _status text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _row public.trusted_relationships%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF _status NOT IN ('accepted','declined','revoked') THEN RAISE EXCEPTION 'Invalid status'; END IF;

  SELECT * INTO _row FROM public.trusted_relationships WHERE id = _id;
  IF _row.id IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF _row.user_id <> _uid THEN RAISE EXCEPTION 'Only the recipient can decide this request'; END IF;

  UPDATE public.trusted_relationships
    SET status = _status, responded_at = now(), updated_at = now()
    WHERE id = _id;

  IF _status = 'accepted' THEN
    INSERT INTO public.user_notifications(user_id, type, title, body, link)
    VALUES (_row.related_user_id, 'trusted_accepted', 'Trusted circle request accepted',
            'You were added to a trusted circle — you can now see and contact them.',
            '/profile/' || _row.user_id);
  END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.respond_to_trust_request(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_to_trust_request(uuid, text) TO authenticated, service_role;

-- ============ C. PRIVACY-RESPECTING FEEDS ============
CREATE OR REPLACE FUNCTION public.list_discovery_deck(
  _role text DEFAULT NULL, _genre text DEFAULT NULL, _skill text DEFAULT NULL,
  _city text DEFAULT NULL, _verified_only boolean DEFAULT false,
  _limit integer DEFAULT 20, _offset integer DEFAULT 0)
RETURNS TABLE(id uuid, full_name text, username text, bio text, location text, avatar_url text,
              cover_image_url text, is_verified boolean, is_featured boolean, last_seen_at timestamptz,
              roles text[], genres text[], skills text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT p.id,
    CASE coalesce(p.display_name_mode,'full_name')
      WHEN 'username' THEN '@' || p.username
      WHEN 'nickname' THEN coalesce(p.nickname, p.full_name)
      WHEN 'custom' THEN coalesce(p.display_name, p.full_name)
      ELSE p.full_name END,
    p.username, p.bio, p.location, p.avatar_url, p.cover_image_url,
    p.is_verified, p.is_featured, p.last_seen_at,
    COALESCE((SELECT array_agg(r.role::text) FROM public.user_creative_roles r WHERE r.user_id = p.id), '{}')::text[],
    COALESCE((SELECT array_agg(g.genre::text) FROM public.user_genres g WHERE g.user_id = p.id), '{}')::text[],
    COALESCE((SELECT array_agg(t.skill) FROM public.user_skill_tags t WHERE t.user_id = p.id), '{}')::text[]
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.id <> auth.uid()
    AND public.can_match_with(auth.uid(), p.id)
    AND NOT EXISTS (SELECT 1 FROM public.swipes s WHERE s.swiper_id = auth.uid() AND s.swiped_id = p.id)
    AND (_verified_only IS NOT TRUE OR p.is_verified = true)
    AND (_city IS NULL OR p.location ILIKE '%' || _city || '%' OR p.city ILIKE '%' || _city || '%')
    AND (_role IS NULL OR EXISTS (SELECT 1 FROM public.user_creative_roles r WHERE r.user_id = p.id AND r.role::text = _role))
    AND (_genre IS NULL OR EXISTS (SELECT 1 FROM public.user_genres g WHERE g.user_id = p.id AND g.genre::text = _genre))
    AND (_skill IS NULL OR EXISTS (SELECT 1 FROM public.user_skill_tags t WHERE t.user_id = p.id AND t.skill ILIKE '%' || _skill || '%'))
  ORDER BY p.is_featured DESC NULLS LAST, p.last_seen_at DESC NULLS LAST, p.id
  LIMIT LEAST(COALESCE(_limit, 20), 50) OFFSET GREATEST(COALESCE(_offset, 0), 0);
$$;

CREATE OR REPLACE FUNCTION public.search_creatives(
  _query text DEFAULT NULL, _role text DEFAULT NULL, _genre text DEFAULT NULL,
  _skill text DEFAULT NULL, _city text DEFAULT NULL, _verified_only boolean DEFAULT false,
  _limit integer DEFAULT 24, _offset integer DEFAULT 0)
RETURNS TABLE(id uuid, full_name text, username text, bio text, location text, avatar_url text,
              is_verified boolean, is_featured boolean, last_seen_at timestamptz,
              roles text[], genres text[], skills text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT p.id,
    CASE coalesce(p.display_name_mode,'full_name')
      WHEN 'username' THEN '@' || p.username
      WHEN 'nickname' THEN coalesce(p.nickname, p.full_name)
      WHEN 'custom' THEN coalesce(p.display_name, p.full_name)
      ELSE p.full_name END,
    p.username, p.bio, p.location, p.avatar_url, p.is_verified, p.is_featured, p.last_seen_at,
    COALESCE((SELECT array_agg(r.role::text) FROM public.user_creative_roles r WHERE r.user_id = p.id), '{}')::text[],
    COALESCE((SELECT array_agg(g.genre::text) FROM public.user_genres g WHERE g.user_id = p.id), '{}')::text[],
    COALESCE((SELECT array_agg(t.skill) FROM public.user_skill_tags t WHERE t.user_id = p.id), '{}')::text[]
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.id <> auth.uid()
    AND public.can_discover(auth.uid(), p.id, 'search')
    AND (_verified_only IS NOT TRUE OR p.is_verified = true)
    AND (_city IS NULL OR p.location ILIKE '%' || _city || '%' OR p.city ILIKE '%' || _city || '%')
    AND (_query IS NULL OR btrim(_query) = '' OR
         p.full_name ILIKE '%' || _query || '%' OR p.username ILIKE '%' || _query || '%'
         OR p.nickname ILIKE '%' || _query || '%' OR p.bio ILIKE '%' || _query || '%'
         OR p.location ILIKE '%' || _query || '%')
    AND (_role IS NULL OR EXISTS (SELECT 1 FROM public.user_creative_roles r WHERE r.user_id = p.id AND r.role::text = _role))
    AND (_genre IS NULL OR EXISTS (SELECT 1 FROM public.user_genres g WHERE g.user_id = p.id AND g.genre::text = _genre))
    AND (_skill IS NULL OR EXISTS (SELECT 1 FROM public.user_skill_tags t WHERE t.user_id = p.id AND t.skill ILIKE '%' || _skill || '%'))
  ORDER BY p.is_verified DESC NULLS LAST, p.last_seen_at DESC NULLS LAST, p.id
  LIMIT LEAST(COALESCE(_limit, 24), 48) OFFSET GREATEST(COALESCE(_offset, 0), 0);
$$;

CREATE OR REPLACE FUNCTION public.list_recommended_creatives(_limit integer DEFAULT 12)
RETURNS TABLE(id uuid, full_name text, username text, bio text, location text, avatar_url text,
              is_verified boolean, roles text[], shared_roles integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH me AS (
    SELECT array_agg(r.role::text) AS roles FROM public.user_creative_roles r WHERE r.user_id = auth.uid()
  )
  SELECT p.id,
    CASE coalesce(p.display_name_mode,'full_name')
      WHEN 'username' THEN '@' || p.username
      WHEN 'nickname' THEN coalesce(p.nickname, p.full_name)
      WHEN 'custom' THEN coalesce(p.display_name, p.full_name)
      ELSE p.full_name END,
    p.username, p.bio, p.location, p.avatar_url, p.is_verified,
    COALESCE((SELECT array_agg(r.role::text) FROM public.user_creative_roles r WHERE r.user_id = p.id), '{}')::text[],
    (SELECT count(*)::int FROM public.user_creative_roles r, me
       WHERE r.user_id = p.id AND r.role::text = ANY (coalesce(me.roles, '{}')))
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.id <> auth.uid()
    AND public.can_discover(auth.uid(), p.id, 'recommendations')
  ORDER BY (SELECT count(*) FROM public.user_creative_roles r, me
            WHERE r.user_id = p.id AND r.role::text = ANY (coalesce(me.roles, '{}'))) DESC,
           p.is_verified DESC NULLS LAST, p.last_seen_at DESC NULLS LAST
  LIMIT LEAST(COALESCE(_limit, 12), 30);
$$;

-- Talent scouting stays capability-gated as well as privacy-gated.
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
    AND public.meets_verification(auth.uid(), 'talent_scouting')
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

-- ============ D. IDENTITY ADMIN CONSOLE (no legal data) ============
CREATE OR REPLACE FUNCTION public.admin_verification_summary()
RETURNS TABLE(status text, level text, total bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_identity_officer(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY
    SELECT i.verification_status, i.verification_level, count(*)
    FROM public.identity_profiles i
    GROUP BY i.verification_status, i.verification_level
    ORDER BY i.verification_status, i.verification_level;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_verifications(_status text DEFAULT NULL, _limit integer DEFAULT 50)
RETURNS TABLE(id uuid, subject_type text, subject_id uuid, username text, capability text,
              status text, requested_at timestamptz, verified_at timestamptz,
              current_level text, has_legal_details boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_identity_officer(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY
    SELECT v.id, v.subject_type, v.subject_id, p.username, v.document_type, v.status,
           v.requested_at, v.verified_at,
           public.user_verification_level(v.subject_id),
           (i.legal_name IS NOT NULL)
    FROM public.identity_verifications v
    LEFT JOIN public.profiles p ON p.id = v.subject_id
    LEFT JOIN public.identity_profiles i ON i.user_id = v.subject_id
    WHERE _status IS NULL OR v.status = _status
    ORDER BY v.requested_at DESC
    LIMIT LEAST(COALESCE(_limit, 50), 200);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_identity_access(_limit integer DEFAULT 100)
RETURNS TABLE(id uuid, accessor_id uuid, accessor_username text, subject_id uuid,
              subject_username text, reason text, accessed_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_identity_officer(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY
    SELECT l.id, l.accessor_id, a.username, l.subject_user_id, s.username, l.reason, l.accessed_at
    FROM public.identity_access_logs l
    LEFT JOIN public.profiles a ON a.id = l.accessor_id
    LEFT JOIN public.profiles s ON s.id = l.subject_user_id
    ORDER BY l.accessed_at DESC
    LIMIT LEAST(COALESCE(_limit, 100), 500);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_decide_verification(_id uuid, _status text, _level text DEFAULT 'identity_verified', _notes text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _subject uuid; _subject_type text;
BEGIN
  IF NOT public.is_identity_officer(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _status NOT IN ('verified','failed','restricted','expired') THEN RAISE EXCEPTION 'Invalid status'; END IF;

  SELECT v.subject_id, v.subject_type INTO _subject, _subject_type
  FROM public.identity_verifications v WHERE v.id = _id;
  IF _subject IS NULL THEN RAISE EXCEPTION 'Verification not found'; END IF;

  UPDATE public.identity_verifications
    SET status = _status, notes = coalesce(_notes, notes),
        verified_at = CASE WHEN _status = 'verified' THEN now() ELSE verified_at END
    WHERE id = _id;

  IF _subject_type = 'user' THEN
    INSERT INTO public.identity_profiles(user_id, verification_status, verification_level, verified_at)
    VALUES (_subject, _status, CASE WHEN _status = 'verified' THEN coalesce(_level,'identity_verified') ELSE 'standard' END,
            CASE WHEN _status = 'verified' THEN now() ELSE NULL END)
    ON CONFLICT (user_id) DO UPDATE
      SET verification_status = _status,
          verification_level = CASE WHEN _status = 'verified' THEN coalesce(_level,'identity_verified') ELSE 'standard' END,
          verified_at = CASE WHEN _status = 'verified' THEN now() ELSE NULL END,
          updated_at = now();

    UPDATE public.profiles SET is_verified = (_status = 'verified') WHERE id = _subject;

    INSERT INTO public.user_notifications(user_id, type, title, body, link)
    VALUES (_subject, 'verification_status',
            CASE WHEN _status = 'verified' THEN 'You are verified' ELSE 'Verification update' END,
            CASE WHEN _status = 'verified' THEN 'Your identity verification was approved.'
                 ELSE 'Your verification could not be completed. You can submit again from Settings.' END,
            '/settings');
  END IF;

  INSERT INTO public.admin_audit_logs(admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'verification_' || _status, 'identity_verification', _id,
          jsonb_build_object('subject_id', _subject, 'level', _level));

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_verification_summary() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_verifications(text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_identity_access(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_decide_verification(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_verification_summary() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_verifications(text, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_identity_access(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_decide_verification(uuid, text, text, text) TO authenticated, service_role;

-- Feed + capability grants
REVOKE ALL ON FUNCTION public.list_discovery_deck(text, text, text, text, boolean, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_discovery_deck(text, text, text, text, boolean, integer, integer) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.search_creatives(text, text, text, text, text, boolean, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_creatives(text, text, text, text, text, boolean, integer, integer) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.list_recommended_creatives(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_recommended_creatives(integer) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.my_capabilities() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_capabilities() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.meets_verification(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meets_verification(uuid, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.requires_verification(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.requires_verification(text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.user_verification_level(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_verification_level(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.verification_rank(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verification_rank(text) TO authenticated, service_role;
