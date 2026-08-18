CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  ref_code TEXT;
  referral_row_id UUID;
  base_username TEXT;
  candidate TEXT;
  suffix INT := 0;
BEGIN
  -- Build a safe, unique username so a collision can never block signup
  base_username := lower(regexp_replace(
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'username', ''), split_part(COALESCE(NEW.email, ''), '@', 1), 'user'),
    '[^a-z0-9_]', '', 'gi'
  ));
  IF base_username IS NULL OR length(base_username) < 3 THEN
    base_username := 'user' || substr(replace(NEW.id::text, '-', ''), 1, 8);
  END IF;
  base_username := substr(base_username, 1, 24);

  candidate := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate)
     OR EXISTS (SELECT 1 FROM public.reserved_usernames WHERE lower(username) = candidate)
  LOOP
    suffix := suffix + 1;
    candidate := substr(base_username, 1, 20) || suffix::text;
    IF suffix > 500 THEN
      candidate := 'user' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
      EXIT;
    END IF;
  END LOOP;

  BEGIN
    INSERT INTO public.profiles (id, email, full_name, username)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      candidate
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN
    INSERT INTO public.profiles (id, email, full_name, username)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      'user' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)
    )
    ON CONFLICT (id) DO NOTHING;
  END;

  -- Newsletter opt-in must never break account creation
  BEGIN
    IF NEW.email IS NOT NULL THEN
      INSERT INTO public.newsletter_subscribers (email, is_active)
      VALUES (NEW.email, true)
      ON CONFLICT (email) DO UPDATE SET is_active = true, unsubscribed_at = NULL;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Referral attribution is best-effort
  BEGIN
    ref_code := NEW.raw_user_meta_data->>'referral_code';
    IF ref_code IS NOT NULL AND ref_code <> '' THEN
      SELECT id INTO referral_row_id
      FROM public.referrals
      WHERE referral_code = ref_code
        AND referred_id IS NULL
        AND status = 'active'
      LIMIT 1;

      IF referral_row_id IS NOT NULL THEN
        UPDATE public.referrals
        SET referred_id = NEW.id, status = 'completed', completed_at = now()
        WHERE id = referral_row_id;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$function$;

-- Duplicate trigger caused two identical subscription inserts per profile
DROP TRIGGER IF EXISTS on_profile_created_subscription ON public.profiles;