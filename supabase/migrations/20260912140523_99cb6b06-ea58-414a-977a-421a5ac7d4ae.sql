GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_member(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_creator(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_studio_member(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_trusted_by(uuid, uuid) TO authenticated;