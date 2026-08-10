-- Authorization hardening: bind both helpers to the caller's own identity.
-- Bodies are unchanged; only an identity guard is added. Signatures, ownership,
-- SECURITY DEFINER, pinned search_path and existing grants are preserved.

CREATE OR REPLACE FUNCTION public.get_match_activity_since(_user_id uuid, _since timestamp with time zone)
 RETURNS TABLE(match_user_id uuid, full_name text, username text, avatar_url text, last_seen_at timestamp with time zone, new_portfolio_items integer, new_messages integer, came_online boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _caller uuid := auth.uid();
BEGIN
  -- A signed-in caller may only read their own match activity.
  IF _caller IS NOT NULL THEN
    IF _user_id IS DISTINCT FROM _caller THEN
      RAISE EXCEPTION 'Forbidden: match activity can only be read for the authenticated user'
        USING ERRCODE = '42501';
    END IF;
  -- No end-user session: only trusted backend roles (scheduled digest job).
  ELSIF NOT pg_has_role(current_user, 'service_role', 'MEMBER') THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH my_matches AS (
    SELECT CASE WHEN m.user_id_1 = _user_id THEN m.user_id_2 ELSE m.user_id_1 END AS other_id
    FROM public.matches m
    WHERE m.user_id_1 = _user_id OR m.user_id_2 = _user_id
  )
  SELECT
    p.id,
    p.full_name,
    p.username,
    p.avatar_url,
    p.last_seen_at,
    (SELECT COUNT(*)::INT FROM public.portfolio_items pi
       WHERE pi.user_id = p.id AND pi.created_at > _since),
    (SELECT COUNT(*)::INT FROM public.messages msg
       JOIN public.conversations c ON c.id = msg.conversation_id
       JOIN public.matches mt ON mt.id = c.match_id
       WHERE msg.sender_id = p.id
         AND msg.created_at > _since
         AND (mt.user_id_1 = _user_id OR mt.user_id_2 = _user_id)),
    (p.last_seen_at IS NOT NULL AND p.last_seen_at > _since)
  FROM public.profiles p
  JOIN my_matches mm ON mm.other_id = p.id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_pending_legal_acceptances(_user_id uuid)
 RETURNS TABLE(slug text, title text, version integer, effective_date date, version_id uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _caller uuid := auth.uid();
BEGIN
  -- A signed-in caller may only read their own pending acceptances.
  IF _caller IS NOT NULL THEN
    IF _user_id IS DISTINCT FROM _caller THEN
      RAISE EXCEPTION 'Forbidden: pending legal acceptances can only be read for the authenticated user'
        USING ERRCODE = '42501';
    END IF;
  ELSIF NOT pg_has_role(current_user, 'service_role', 'MEMBER') THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
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
END;
$function$;

-- Re-assert the tightened grants (CREATE OR REPLACE preserves them, but be explicit).
REVOKE ALL ON FUNCTION public.get_match_activity_since(uuid, timestamp with time zone) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_match_activity_since(uuid, timestamp with time zone) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_match_activity_since(uuid, timestamp with time zone) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_pending_legal_acceptances(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_pending_legal_acceptances(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_pending_legal_acceptances(uuid) TO authenticated, service_role;