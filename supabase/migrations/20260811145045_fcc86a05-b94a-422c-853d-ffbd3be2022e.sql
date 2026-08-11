-- 1. Old-handle -> current handle resolver (public, returns only handles)
CREATE OR REPLACE FUNCTION public.resolve_username_redirect(_handle text)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.username
  FROM public.username_history h
  JOIN public.profiles p ON p.id = h.user_id
  WHERE lower(h.old_username) = lower(coalesce(_handle, ''))
    AND p.username IS NOT NULL
    AND lower(p.username) <> lower(coalesce(_handle, ''))
  ORDER BY h.changed_at DESC
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.resolve_username_redirect(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_username_redirect(text) TO anon, authenticated, service_role;

CREATE INDEX IF NOT EXISTS username_history_old_lower_idx
  ON public.username_history (lower(old_username));

-- 2. Admin stats with date-range filters
DROP FUNCTION IF EXISTS public.admin_username_change_stats(text, integer);

CREATE OR REPLACE FUNCTION public.admin_username_change_stats(
  _search text DEFAULT NULL,
  _limit integer DEFAULT 50,
  _from timestamptz DEFAULT NULL,
  _to timestamptz DEFAULT NULL
)
RETURNS TABLE(
  user_id uuid,
  username text,
  display_name text,
  change_count integer,
  first_changed_at timestamptz,
  last_changed_at timestamptz,
  history jsonb
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'master_admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'compliance_admin')
    OR public.has_role(auth.uid(), 'trust_safety_admin')
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT p.id,
         p.username,
         p.display_name,
         agg.cnt::integer,
         agg.first_at,
         agg.last_at,
         agg.hist
  FROM public.profiles p
  JOIN (
    SELECT h.user_id,
           count(*) AS cnt,
           min(h.changed_at) AS first_at,
           max(h.changed_at) AS last_at,
           jsonb_agg(jsonb_build_object('old', h.old_username, 'new', h.new_username, 'at', h.changed_at)
                     ORDER BY h.changed_at DESC) AS hist
    FROM public.username_history h
    WHERE (_from IS NULL OR h.changed_at >= _from)
      AND (_to IS NULL OR h.changed_at <= _to)
    GROUP BY h.user_id
  ) agg ON agg.user_id = p.id
  WHERE _search IS NULL
     OR p.username ILIKE '%' || _search || '%'
     OR p.display_name ILIKE '%' || _search || '%'
     OR EXISTS (
          SELECT 1 FROM public.username_history h2
          WHERE h2.user_id = p.id
            AND (h2.old_username ILIKE '%' || _search || '%'
                 OR h2.new_username ILIKE '%' || _search || '%')
        )
  ORDER BY agg.last_at DESC NULLS LAST
  LIMIT COALESCE(_limit, 50);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_username_change_stats(text, integer, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_username_change_stats(text, integer, timestamptz, timestamptz) TO authenticated;