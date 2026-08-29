-- 1. Precise coordinates are no longer directly readable by app clients.
REVOKE SELECT (latitude, longitude) ON public.profiles FROM anon, authenticated;

-- Own coordinates remain available through a scoped helper.
CREATE OR REPLACE FUNCTION public.get_my_location()
RETURNS TABLE (latitude double precision, longitude double precision, city text, country text, location text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.latitude, p.longitude, p.city, p.country, p.location
  FROM public.profiles p
  WHERE p.id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.get_my_location() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_location() TO authenticated;

-- 2. Role/genre tags now follow the same visibility rules as the profile itself.
DROP POLICY IF EXISTS "User roles are viewable by everyone" ON public.user_creative_roles;
CREATE POLICY "User roles follow profile visibility"
ON public.user_creative_roles
FOR SELECT
USING (
  auth.uid() = user_id
  OR (public.can_see_user(auth.uid(), user_id) AND public.profile_visible_to(auth.uid(), user_id))
);

DROP POLICY IF EXISTS "User genres are viewable by everyone" ON public.user_genres;
CREATE POLICY "User genres follow profile visibility"
ON public.user_genres
FOR SELECT
USING (
  auth.uid() = user_id
  OR (public.can_see_user(auth.uid(), user_id) AND public.profile_visible_to(auth.uid(), user_id))
);