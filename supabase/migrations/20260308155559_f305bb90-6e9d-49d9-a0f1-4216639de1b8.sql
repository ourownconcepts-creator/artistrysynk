
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT jsonb_build_object(
    'users', (SELECT count(*) FROM public.profiles),
    'projects', (SELECT count(*) FROM public.projects),
    'portfolio_items', (SELECT count(*) FROM public.portfolio_items),
    'matches', (SELECT count(*) FROM public.matches),
    'services', (SELECT count(*) FROM public.services WHERE is_active = true),
    'collaboration_posts', (SELECT count(*) FROM public.collaboration_posts),
    'collaboration_requests', (SELECT count(*) FROM public.collaboration_requests WHERE status = 'accepted'),
    'countries', (SELECT count(DISTINCT country) FROM public.profiles WHERE country IS NOT NULL)
  );
$$;
