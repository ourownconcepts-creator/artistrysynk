CREATE OR REPLACE FUNCTION public.notify_match_came_online()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  display_name text;
BEGIN
  -- Only treat as "came online" when previously unseen for 6+ hours.
  IF OLD.last_seen_at IS NOT NULL AND OLD.last_seen_at > now() - interval '6 hours' THEN
    RETURN NEW;
  END IF;

  display_name := COALESCE(NULLIF(NEW.full_name, ''), NEW.username, 'Your match');

  INSERT INTO public.user_notifications (user_id, type, title, message, data)
  SELECT
    other_id,
    'match_online',
    display_name || ' is online',
    display_name || ' just came online — say hi!',
    jsonb_build_object('profile_id', NEW.id)
  FROM (
    SELECT CASE WHEN m.user_id_1 = NEW.id THEN m.user_id_2 ELSE m.user_id_1 END AS other_id
    FROM public.matches m
    WHERE m.user_id_1 = NEW.id OR m.user_id_2 = NEW.id
  ) mm
  WHERE EXISTS (
    SELECT 1 FROM public.user_settings s
    WHERE s.user_id = mm.other_id AND s.match_online_notifications = true
  )
  -- Per-recipient daily cap: no repeat alert about the same person within 24h.
  AND NOT EXISTS (
    SELECT 1 FROM public.user_notifications n
    WHERE n.user_id = mm.other_id
      AND n.type = 'match_online'
      AND n.created_at > now() - interval '24 hours'
      AND n.data->>'profile_id' = NEW.id::text
  );

  RETURN NEW;
END;
$$;