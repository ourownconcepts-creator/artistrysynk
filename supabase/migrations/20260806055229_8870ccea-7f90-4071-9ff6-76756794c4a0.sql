-- Let users read their own email history
CREATE POLICY "Users can view their own email log"
  ON public.email_send_log FOR SELECT
  TO authenticated
  USING (
    recipient_email = (SELECT p.email FROM public.profiles p WHERE p.id = auth.uid())
  );
GRANT SELECT ON public.email_send_log TO authenticated;

-- 1) Notify a creator when someone likes (discovers) them
CREATE OR REPLACE FUNCTION public.notify_new_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  liker_name TEXT;
BEGIN
  IF NEW.liked IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(full_name, ''), username, 'Someone')
    INTO liker_name
  FROM public.profiles WHERE id = NEW.swiper_id;

  INSERT INTO public.user_notifications (user_id, type, title, message, data)
  VALUES (
    NEW.swiped_id,
    'like',
    'Someone liked your profile',
    COALESCE(liker_name, 'Someone') || ' discovered and liked your profile.',
    jsonb_build_object('swipe_id', NEW.id, 'liker_id', NEW.swiper_id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_swipe_notify_like ON public.swipes;
CREATE TRIGGER on_swipe_notify_like
AFTER INSERT ON public.swipes
FOR EACH ROW EXECUTE FUNCTION public.notify_new_like();

-- 2) Notify matches when a user comes back online after being away
CREATE OR REPLACE FUNCTION public.notify_match_came_online()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  display_name TEXT;
BEGIN
  IF NEW.last_seen_at IS NULL THEN
    RETURN NEW;
  END IF;
  IF OLD.last_seen_at IS NOT NULL AND NEW.last_seen_at - OLD.last_seen_at < interval '30 minutes' THEN
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
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_presence_notify_matches ON public.profiles;
CREATE TRIGGER on_presence_notify_matches
AFTER UPDATE OF last_seen_at ON public.profiles
FOR EACH ROW
WHEN (OLD.last_seen_at IS DISTINCT FROM NEW.last_seen_at)
EXECUTE FUNCTION public.notify_match_came_online();

-- 3) Email fan-out for every in-app notification (messages keep their dedicated handler)
CREATE OR REPLACE FUNCTION public.trigger_notification_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.type = 'message' THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := 'https://lihctrhzsyjqnlzwwkzo.supabase.co/functions/v1/notify-user-notification-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key'
        )
      ),
      body := jsonb_build_object('notification_id', NEW.id)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trigger_notification_email failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_notification_send_email ON public.user_notifications;
CREATE TRIGGER on_notification_send_email
AFTER INSERT ON public.user_notifications
FOR EACH ROW EXECUTE FUNCTION public.trigger_notification_email();