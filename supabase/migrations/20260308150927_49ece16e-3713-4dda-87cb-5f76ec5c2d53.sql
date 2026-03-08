
-- Add latitude and longitude columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longitude double precision;

-- Create a function to find nearby creators using Haversine formula
CREATE OR REPLACE FUNCTION public.get_nearby_creators(
  _user_id uuid,
  _lat double precision,
  _lng double precision,
  _radius_km double precision DEFAULT 100,
  _limit integer DEFAULT 20
)
RETURNS TABLE(
  id uuid,
  full_name text,
  username text,
  avatar_url text,
  location text,
  city text,
  country text,
  bio text,
  is_verified boolean,
  latitude double precision,
  longitude double precision,
  distance_km double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
    p.latitude,
    p.longitude,
    (6371 * acos(
      cos(radians(_lat)) * cos(radians(p.latitude)) *
      cos(radians(p.longitude) - radians(_lng)) +
      sin(radians(_lat)) * sin(radians(p.latitude))
    )) AS distance_km
  FROM public.profiles p
  WHERE p.id != _user_id
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND p.is_hidden IS NOT TRUE
    AND (6371 * acos(
      LEAST(1.0, cos(radians(_lat)) * cos(radians(p.latitude)) *
      cos(radians(p.longitude) - radians(_lng)) +
      sin(radians(_lat)) * sin(radians(p.latitude)))
    )) <= _radius_km
  ORDER BY distance_km ASC
  LIMIT _limit;
$$;
