-- 1. Push mapping: message kinds were never mapped, so studio inbox pushes never fired.
CREATE OR REPLACE FUNCTION public.dispatch_push_for_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_kind text;
  v_allowed boolean;
BEGIN
  v_kind := COALESCE(NEW.data->>'push_kind', NEW.type);

  SELECT CASE v_kind
    WHEN 'invites' THEN s.notify_push_invites
    WHEN 'studio_invite' THEN s.notify_push_invites
    WHEN 'invite_responses' THEN s.notify_push_invite_responses
    WHEN 'studio_ownership_transfer' THEN s.notify_push_invite_responses
    WHEN 'room_activity' THEN s.notify_push_room_activity
    WHEN 'studio_deactivated' THEN s.notify_push_room_activity
    WHEN 'studio_reactivated' THEN s.notify_push_room_activity
    WHEN 'role_requests' THEN s.notify_push_role_requests
    WHEN 'message' THEN COALESCE(s.message_notifications, true)
    WHEN 'studio_message' THEN COALESCE(s.message_notifications, true)
    ELSE false
  END
  AND COALESCE(s.push_notifications, true)
  INTO v_allowed
  FROM public.user_settings s
  WHERE s.user_id = NEW.user_id;

  IF COALESCE(v_allowed, false) = false THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := 'https://lihctrhzsyjqnlzwwkzo.supabase.co/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key'
        )
      ),
      body := jsonb_build_object(
        'userId', NEW.user_id,
        'title', NEW.title,
        'body', NEW.message,
        'url', COALESCE(NEW.data->>'url', '/notifications'),
        'data', NEW.data
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'dispatch_push_for_notification failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

-- 2. Studio message notifications carry an explicit deep link + push kind.
CREATE OR REPLACE FUNCTION public.notify_new_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  conv RECORD;
  other_user_id UUID;
  studio_name TEXT;
  studio_handle TEXT;
BEGIN
  SELECT match_id, studio_id, customer_id INTO conv
  FROM public.conversations WHERE id = NEW.conversation_id;

  IF conv.studio_id IS NOT NULL THEN
    SELECT s.name, s.handle INTO studio_name, studio_handle
    FROM public.studios s WHERE s.id = conv.studio_id;

    IF NEW.sender_id = conv.customer_id THEN
      INSERT INTO public.user_notifications (user_id, type, title, message, data)
      SELECT sm.user_id, 'message', 'New studio message',
             'Your studio has a new message',
             jsonb_build_object(
               'conversation_id', NEW.conversation_id,
               'sender_id', NEW.sender_id,
               'studio_id', conv.studio_id,
               'studio_handle', studio_handle,
               'push_kind', 'studio_message',
               'url', '/messages/' || NEW.conversation_id
             )
      FROM public.studio_members sm
      WHERE sm.studio_id = conv.studio_id
        AND sm.status = 'active'
        AND sm.user_id <> NEW.sender_id
        AND public.has_studio_capability(sm.user_id, conv.studio_id, 'manage_inbox');
    ELSE
      INSERT INTO public.user_notifications (user_id, type, title, message, data)
      VALUES (conv.customer_id, 'message', 'New Message',
              COALESCE(studio_name, 'A studio') || ' sent you a message',
              jsonb_build_object(
                'conversation_id', NEW.conversation_id,
                'sender_id', NEW.sender_id,
                'studio_id', conv.studio_id,
                'studio_handle', studio_handle,
                'push_kind', 'studio_message',
                'url', '/messages/' || NEW.conversation_id
              ));
    END IF;

    RETURN NEW;
  END IF;

  SELECT CASE WHEN m.user_id_1 = NEW.sender_id THEN m.user_id_2 ELSE m.user_id_1 END
    INTO other_user_id
  FROM public.matches m WHERE m.id = conv.match_id;

  IF other_user_id IS NOT NULL THEN
    INSERT INTO public.user_notifications (user_id, type, title, message, data)
    VALUES (other_user_id, 'message', 'New Message', 'You have a new message',
            jsonb_build_object(
              'conversation_id', NEW.conversation_id,
              'sender_id', NEW.sender_id,
              'push_kind', 'message',
              'url', '/messages/' || NEW.conversation_id
            ));
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. Stable equipment paging: created_at alone repeats/skips rows across pages.
CREATE OR REPLACE FUNCTION public.list_studio_public_equipment(_studio_id uuid, _limit integer DEFAULT 50, _offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, name text, category text, brand text, model text, description text, photo_url text, quantity integer, is_available boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT e.id, e.name, e.category, e.brand, e.model, e.description, e.photo_url, e.quantity, e.is_available
  FROM public.studio_equipment e
  JOIN public.studios s ON s.id = e.studio_id
  WHERE e.studio_id = _studio_id
    AND s.is_active AND NOT s.is_hidden AND s.visibility = 'public'
  ORDER BY e.created_at DESC, e.id DESC
  LIMIT LEAST(COALESCE(_limit, 50), 200)
  OFFSET GREATEST(COALESCE(_offset, 0), 0);
$function$;

-- 4. Indexes for equipment paging and studio search at scale.
CREATE INDEX IF NOT EXISTS idx_studio_equipment_studio_created
  ON public.studio_equipment (studio_id, created_at DESC, id DESC);

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_studios_name_trgm
  ON public.studios USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_studios_handle_trgm
  ON public.studios USING gin (handle gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_studios_tagline_trgm
  ON public.studios USING gin (tagline gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_studios_public_listing
  ON public.studios (is_verified DESC, created_at DESC)
  WHERE is_active AND NOT is_hidden AND visibility = 'public';
