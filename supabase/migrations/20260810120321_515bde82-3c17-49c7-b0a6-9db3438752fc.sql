REVOKE EXECUTE ON FUNCTION public.studio_role_capability(public.studio_role, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.studio_management_allowed(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.studio_ownership_block(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.studio_ownership_block(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.studio_ownership_block(uuid) TO service_role;