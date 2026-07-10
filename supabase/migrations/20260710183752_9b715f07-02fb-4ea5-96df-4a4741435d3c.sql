
CREATE OR REPLACE FUNCTION public.trigger_notify_new_message_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://lihctrhzsyjqnlzwwkzo.supabase.co/functions/v1/notify-new-message-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
    ),
    body := jsonb_build_object(
      'conversation_id', NEW.conversation_id,
      'sender_id', NEW.sender_id,
      'content', NEW.content
    )
  );
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_new_message_send_email ON public.messages;
CREATE TRIGGER on_new_message_send_email
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.trigger_notify_new_message_email();
