-- Public browse/search listings honour the "appear in search" preference.
CREATE OR REPLACE FUNCTION public.list_public_profiles(_role text DEFAULT NULL::text, _city text DEFAULT NULL::text, _limit integer DEFAULT 48, _offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, full_name text, username text, bio text, location text, city text, country text, avatar_url text, is_verified boolean, roles text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    p.id,
    p.full_name,
    p.username,
    p.bio,
    p.location,
    p.city,
    p.country,
    p.avatar_url,
    p.is_verified,
    COALESCE((SELECT array_agg(r.role::text ORDER BY r.role::text) FROM public.user_creative_roles r WHERE r.user_id = p.id), '{}')::text[]
  FROM public.profiles p
  LEFT JOIN public.user_settings s ON s.user_id = p.id
  WHERE COALESCE(p.is_hidden, false) = false
    AND COALESCE(s.profile_visibility, 'public') = 'public'
    AND COALESCE(s.discoverable_in_search, true) = true
    AND (
      _role IS NULL
      OR EXISTS (
        SELECT 1 FROM public.user_creative_roles r
        WHERE r.user_id = p.id AND r.role::text = _role
      )
    )
    AND (
      _city IS NULL
      OR lower(COALESCE(p.city, '')) = lower(_city)
      OR lower(COALESCE(p.location, '')) LIKE '%' || lower(_city) || '%'
    )
  ORDER BY p.is_verified DESC NULLS LAST, p.updated_at DESC NULLS LAST
  LIMIT LEAST(GREATEST(COALESCE(_limit, 48), 1), 200)
  OFFSET GREATEST(COALESCE(_offset, 0), 0);
$function$;

CREATE OR REPLACE FUNCTION public.list_public_locations(_min_creators integer DEFAULT 1)
 RETURNS TABLE(city text, country text, creator_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.city, MAX(p.country) AS country, COUNT(*) AS creator_count
  FROM public.profiles p
  LEFT JOIN public.user_settings s ON s.user_id = p.id
  WHERE COALESCE(p.is_hidden, false) = false
    AND COALESCE(s.profile_visibility, 'public') = 'public'
    AND COALESCE(s.discoverable_in_search, true) = true
    AND p.city IS NOT NULL
    AND length(trim(p.city)) > 0
  GROUP BY p.city
  HAVING COUNT(*) >= GREATEST(COALESCE(_min_creators, 1), 1)
  ORDER BY COUNT(*) DESC, p.city ASC;
$function$;

-- Nearby search honours location-precision choices.
CREATE OR REPLACE FUNCTION public.get_nearby_creators(_user_id uuid, _lat double precision, _lng double precision, _radius_km double precision DEFAULT 100, _limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, full_name text, username text, avatar_url text, location text, city text, country text, bio text, is_verified boolean, latitude double precision, longitude double precision, distance_km double precision)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    p.id,
    p.full_name,
    p.username,
    p.avatar_url,
    p.location,
    p.city,
    p.country,
    p.bio,
    p.is_verified,
    CASE WHEN COALESCE(s.location_precision, 'city') = 'precise' THEN p.latitude ELSE NULL END,
    CASE WHEN COALESCE(s.location_precision, 'city') = 'precise' THEN p.longitude ELSE NULL END,
    (6371 * acos(
      LEAST(1.0, cos(radians(_lat)) * cos(radians(p.latitude)) *
      cos(radians(p.longitude) - radians(_lng)) +
      sin(radians(_lat)) * sin(radians(p.latitude)))
    )) AS distance_km
  FROM public.profiles p
  LEFT JOIN public.user_settings s ON s.user_id = p.id
  WHERE p.id != _user_id
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND p.is_hidden IS NOT TRUE
    AND COALESCE(s.location_precision, 'city') <> 'off'
    AND COALESCE(s.discoverable_in_search, true) = true
    AND (6371 * acos(
      LEAST(1.0, cos(radians(_lat)) * cos(radians(p.latitude)) *
      cos(radians(p.longitude) - radians(_lng)) +
      sin(radians(_lat)) * sin(radians(p.latitude)))
    )) <= _radius_km
  ORDER BY distance_km ASC
  LIMIT _limit;
$function$;

-- Helper the app uses to filter swipe/recommendation candidates.
CREATE OR REPLACE FUNCTION public.is_discoverable(_user_id uuid, _surface text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE _surface
    WHEN 'discovery' THEN COALESCE(s.discoverable_in_discovery, true)
    WHEN 'search' THEN COALESCE(s.discoverable_in_search, true)
    WHEN 'recommendations' THEN COALESCE(s.discoverable_in_recommendations, true)
    ELSE true
  END
  FROM public.profiles p
  LEFT JOIN public.user_settings s ON s.user_id = p.id
  WHERE p.id = _user_id
$function$;

REVOKE ALL ON FUNCTION public.is_discoverable(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_discoverable(uuid, text) TO authenticated;