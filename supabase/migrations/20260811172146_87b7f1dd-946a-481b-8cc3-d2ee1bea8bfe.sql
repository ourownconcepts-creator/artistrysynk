CREATE OR REPLACE FUNCTION public.profile_visible_to(_viewer uuid, _target uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    _viewer = _target
    OR (_viewer IS NOT NULL AND (
      public.has_role(_viewer, 'admin') OR public.has_role(_viewer, 'master_admin')
      OR public.has_role(_viewer, 'super_admin') OR public.has_role(_viewer, 'moderator')
      OR public.has_existing_relationship(_viewer, _target)
      OR EXISTS (
        SELECT 1
        FROM public.conversations c
        JOIN public.studios s ON s.id = c.studio_id
        WHERE c.studio_id IS NOT NULL
          AND (
            (c.customer_id = _viewer AND s.owner_id = _target)
            OR (c.customer_id = _target AND s.owner_id = _viewer)
          )
      )
    ))
    OR public.can_discover(_viewer, _target, 'search')
$function$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prorettype = 'trigger'::regtype
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END $$;