
-- Public (anonymous-safe) SEO read surface. No table changes, no email exposure.

CREATE OR REPLACE FUNCTION public.get_public_profile(_identifier text)
RETURNS TABLE (
  id uuid,
  full_name text,
  username text,
  bio text,
  location text,
  city text,
  country text,
  avatar_url text,
  cover_image_url text,
  social_links jsonb,
  is_verified boolean,
  created_at timestamptz,
  roles text[],
  genres text[],
  skills text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.full_name,
    p.username,
    p.bio,
    p.location,
    p.city,
    p.country,
    p.avatar_url,
    p.cover_image_url,
    p.social_links,
    p.is_verified,
    p.created_at,
    COALESCE((SELECT array_agg(r.role::text ORDER BY r.role::text) FROM public.user_creative_roles r WHERE r.user_id = p.id), '{}')::text[],
    COALESCE((SELECT array_agg(g.genre::text ORDER BY g.genre::text) FROM public.user_genres g WHERE g.user_id = p.id), '{}')::text[],
    COALESCE((SELECT array_agg(t.skill ORDER BY t.skill) FROM public.user_skill_tags t WHERE t.user_id = p.id), '{}')::text[]
  FROM public.profiles p
  LEFT JOIN public.user_settings s ON s.user_id = p.id
  WHERE COALESCE(p.is_hidden, false) = false
    AND COALESCE(s.profile_visibility, 'public') = 'public'
    AND (p.username = _identifier OR p.id::text = _identifier)
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.list_public_profiles(
  _role text DEFAULT NULL,
  _city text DEFAULT NULL,
  _limit integer DEFAULT 48,
  _offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  full_name text,
  username text,
  bio text,
  location text,
  city text,
  country text,
  avatar_url text,
  is_verified boolean,
  roles text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.list_public_portfolio(_user_id uuid, _limit integer DEFAULT 12)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  media_type text,
  media_url text,
  thumbnail_url text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pi.id, pi.title, pi.description, pi.media_type, pi.media_url, pi.thumbnail_url, pi.created_at
  FROM public.portfolio_items pi
  JOIN public.profiles p ON p.id = pi.user_id
  LEFT JOIN public.user_settings s ON s.user_id = p.id
  WHERE pi.user_id = _user_id
    AND COALESCE(pi.is_hidden, false) = false
    AND COALESCE(p.is_hidden, false) = false
    AND COALESCE(s.profile_visibility, 'public') = 'public'
  ORDER BY pi.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 12), 1), 60);
$$;

CREATE OR REPLACE FUNCTION public.list_public_locations(_min_creators integer DEFAULT 1)
RETURNS TABLE (city text, country text, creator_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.city, MAX(p.country) AS country, COUNT(*) AS creator_count
  FROM public.profiles p
  LEFT JOIN public.user_settings s ON s.user_id = p.id
  WHERE COALESCE(p.is_hidden, false) = false
    AND COALESCE(s.profile_visibility, 'public') = 'public'
    AND p.city IS NOT NULL
    AND length(trim(p.city)) > 0
  GROUP BY p.city
  HAVING COUNT(*) >= GREATEST(COALESCE(_min_creators, 1), 1)
  ORDER BY COUNT(*) DESC, p.city ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_profiles(text, text, integer, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_portfolio(uuid, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_locations(integer) TO anon, authenticated;
