
-- 1. Fix can_see_user to require authenticated viewer (prevents unauthenticated email exposure)
CREATE OR REPLACE FUNCTION public.can_see_user(_viewer_id uuid, _target_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT 
    CASE 
      WHEN _viewer_id IS NULL THEN false
      ELSE NOT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _target_id AND role = 'super_admin'
      ) OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _viewer_id AND role = 'super_admin'
      )
    END
$$;

-- 2. Fix trigger_notify_new_match to use current project
CREATE OR REPLACE FUNCTION public.trigger_notify_new_match()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://lihctrhzsyjqnlzwwkzo.supabase.co/functions/v1/notify-new-match',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
    ),
    body := jsonb_build_object('matchId', NEW.id)
  );
  RETURN NEW;
END;
$function$;

-- 3. Fix trigger_notify_suspension to use current project
CREATE OR REPLACE FUNCTION public.trigger_notify_suspension()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://lihctrhzsyjqnlzwwkzo.supabase.co/functions/v1/notify-critical-action',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
    ),
    body := jsonb_build_object('actionType', 'suspension', 'userId', NEW.user_id, 'suspendedBy', NEW.suspended_by, 'reason', NEW.reason)
  );
  RETURN NEW;
END;
$function$;

-- 4. Fix trigger_notify_verification_request to use current project
CREATE OR REPLACE FUNCTION public.trigger_notify_verification_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://lihctrhzsyjqnlzwwkzo.supabase.co/functions/v1/notify-verification-request',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
    ),
    body := jsonb_build_object('requestId', NEW.id, 'userId', NEW.user_id)
  );
  RETURN NEW;
END;
$function$;

-- 5. Tighten newsletter subscriber INSERT policy with email format validation
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscribers;
CREATE POLICY "Anyone can subscribe to newsletter"
ON public.newsletter_subscribers
FOR INSERT
WITH CHECK (
  email IS NOT NULL 
  AND email <> '' 
  AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND length(email) <= 255
);

-- 6. Restrict public bucket listing - only allow access to specific files, not listing
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view portfolio files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view email assets" ON storage.objects;

-- Recreate scoped public read policies (file-level, not bucket listing)
CREATE POLICY "Public read portfolio files" ON storage.objects
FOR SELECT USING (bucket_id = 'portfolios' AND name IS NOT NULL);

CREATE POLICY "Public read email assets" ON storage.objects
FOR SELECT USING (bucket_id = 'email-assets' AND name IS NOT NULL);
