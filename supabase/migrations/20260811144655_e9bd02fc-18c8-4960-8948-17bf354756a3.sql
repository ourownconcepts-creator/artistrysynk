ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS notify_email_verification boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_inapp_verification boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_intros boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_inapp_intros boolean NOT NULL DEFAULT true;

-- Member-facing username history
CREATE OR REPLACE FUNCTION public.my_username_history()
RETURNS TABLE(old_username text, new_username text, changed_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT h.old_username, h.new_username, h.changed_at
  FROM public.username_history h
  WHERE h.user_id = auth.uid()
  ORDER BY h.changed_at DESC
$$;
REVOKE ALL ON FUNCTION public.my_username_history() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_username_history() TO authenticated;

-- Admin-facing username change stats
CREATE OR REPLACE FUNCTION public.admin_username_change_stats(_search text DEFAULT NULL, _limit integer DEFAULT 50)
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
         COALESCE(agg.cnt, 0)::integer,
         agg.first_at,
         agg.last_at,
         COALESCE(agg.hist, '[]'::jsonb)
  FROM public.profiles p
  LEFT JOIN (
    SELECT h.user_id,
           count(*) AS cnt,
           min(h.changed_at) AS first_at,
           max(h.changed_at) AS last_at,
           jsonb_agg(jsonb_build_object('old', h.old_username, 'new', h.new_username, 'at', h.changed_at)
                     ORDER BY h.changed_at DESC) AS hist
    FROM public.username_history h
    GROUP BY h.user_id
  ) agg ON agg.user_id = p.id
  WHERE (_search IS NULL OR _search = ''
         OR p.username ILIKE '%' || _search || '%'
         OR p.display_name ILIKE '%' || _search || '%')
    AND COALESCE(agg.cnt, 0) > 0
  ORDER BY COALESCE(agg.cnt, 0) DESC, agg.last_at DESC NULLS LAST
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 50), 200));
END;
$$;
REVOKE ALL ON FUNCTION public.admin_username_change_stats(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_username_change_stats(text, integer) TO authenticated;