-- 1. Pin search_path on the four functions missing it (all pgmq calls are schema-qualified)
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;

-- 2. Revoke direct EXECUTE from anon/authenticated on every public function,
--    then grant back only what each role legitimately needs.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- 3. Public (anon + authenticated) read-only RPCs used by indexable pages
GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_profiles(text, text, integer, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_locations(integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_portfolio(uuid, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_stats() TO anon, authenticated;

-- 4. Helpers that RLS policies and signed-in app code rely on
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_see_user(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_creator(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_approve_project_roles(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_nearby_creators(uuid, double precision, double precision, double precision, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_match_activity_since(uuid, timestamp with time zone) TO authenticated;
