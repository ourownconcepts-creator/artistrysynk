
-- 1. Update can_see_user to enforce is_hidden flag
CREATE OR REPLACE FUNCTION public.can_see_user(_viewer_id uuid, _target_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    CASE
      WHEN _viewer_id IS NULL THEN false
      WHEN _viewer_id = _target_id THEN true
      WHEN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _viewer_id
          AND role IN ('admin','master_admin','super_admin')
      ) THEN true
      WHEN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _target_id AND role = 'super_admin'
      ) THEN false
      WHEN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = _target_id AND is_hidden = true
      ) THEN false
      ELSE true
    END
$function$;

-- 2. Revoke email column read access from regular roles
REVOKE SELECT (email) ON public.profiles FROM anon, authenticated;

-- 3. Secure RPC to fetch emails (only owner or admins)
CREATE OR REPLACE FUNCTION public.get_profile_emails(_user_ids uuid[])
RETURNS TABLE(id uuid, email text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _viewer uuid := auth.uid();
  _is_admin boolean;
BEGIN
  IF _viewer IS NULL THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _viewer
      AND role IN ('admin','master_admin','super_admin')
  ) INTO _is_admin;

  RETURN QUERY
  SELECT p.id, p.email
  FROM public.profiles p
  WHERE p.id = ANY(_user_ids)
    AND (_is_admin OR p.id = _viewer);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_emails(uuid[]) TO authenticated;
