-- Returns the users who opted OUT of a given surface, so client queries can
-- exclude them without being able to read anyone else's settings row.
CREATE OR REPLACE FUNCTION public.list_opted_out_ids(_surface text)
RETURNS TABLE(user_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT s.user_id
  FROM public.user_settings s
  WHERE CASE _surface
    WHEN 'discovery' THEN s.discoverable_in_discovery = false
    WHEN 'search' THEN s.discoverable_in_search = false
    WHEN 'recommendations' THEN s.discoverable_in_recommendations = false
    ELSE false
  END
$function$;

REVOKE ALL ON FUNCTION public.list_opted_out_ids(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.list_opted_out_ids(text) TO authenticated;