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
  SELECT count(*) INTO user_count FROM public.profiles;
  SELECT count(*) INTO project_count FROM public.projects;
  SELECT count(*) INTO portfolio_count FROM public.portfolio_items;
  SELECT count(*) INTO match_count FROM public.matches;
  SELECT count(*) INTO collab_count FROM public.collaboration_posts;
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