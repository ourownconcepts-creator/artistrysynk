
-- Replace get_platform_stats with a faster version using reltuples estimates for large tables
CREATE OR REPLACE FUNCTION public.get_platform_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  user_count bigint;
  project_count bigint;
  portfolio_count bigint;
  match_count bigint;
  service_count bigint;
  collab_count bigint;
  collab_req_count bigint;
  country_count bigint;
BEGIN
  -- Use pg_class reltuples for approximate fast counts on large tables
  SELECT GREATEST(reltuples::bigint, 0) INTO user_count
    FROM pg_class WHERE relname = 'profiles';
  SELECT GREATEST(reltuples::bigint, 0) INTO project_count
    FROM pg_class WHERE relname = 'projects';
  SELECT GREATEST(reltuples::bigint, 0) INTO portfolio_count
    FROM pg_class WHERE relname = 'portfolio_items';
  SELECT GREATEST(reltuples::bigint, 0) INTO match_count
    FROM pg_class WHERE relname = 'matches';
  SELECT GREATEST(reltuples::bigint, 0) INTO collab_count
    FROM pg_class WHERE relname = 'collaboration_posts';

  -- These need exact counts due to WHERE filters, but are typically smaller tables
  SELECT count(*) INTO service_count FROM public.services WHERE is_active = true;
  SELECT count(*) INTO collab_req_count FROM public.collaboration_requests WHERE status = 'accepted';
  SELECT count(DISTINCT country) INTO country_count FROM public.profiles WHERE country IS NOT NULL;

  result := jsonb_build_object(
    'users', user_count,
    'projects', project_count,
    'portfolio_items', portfolio_count,
    'matches', match_count,
    'services', service_count,
    'collaboration_posts', collab_count,
    'collaboration_requests', collab_req_count,
    'countries', country_count
  );
  RETURN result;
END;
$function$;

-- Add indexes for common query patterns at scale
CREATE INDEX IF NOT EXISTS idx_profiles_country ON public.profiles (country) WHERE country IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_is_hidden ON public.profiles (is_hidden) WHERE is_hidden = false;
CREATE INDEX IF NOT EXISTS idx_profiles_location_coords ON public.profiles (latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_swipes_swiper_swiped ON public.swipes (swiper_id, swiped_id);
CREATE INDEX IF NOT EXISTS idx_swipes_swiped_liked ON public.swipes (swiped_id, liked) WHERE liked = true;
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON public.user_notifications (user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collaboration_posts_created ON public.collaboration_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_services_active ON public.services (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_collab_requests_status ON public.collaboration_requests (status);
CREATE INDEX IF NOT EXISTS idx_matches_user1 ON public.matches (user_id_1);
CREATE INDEX IF NOT EXISTS idx_matches_user2 ON public.matches (user_id_2);
CREATE INDEX IF NOT EXISTS idx_conversations_match ON public.conversations (match_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_active ON public.job_postings (is_active, created_at DESC) WHERE is_active = true;
