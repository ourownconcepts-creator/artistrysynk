
-- Update handle_new_user to also process referral codes
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ref_code TEXT;
  referral_row_id UUID;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;

  -- Auto-subscribe to newsletter
  INSERT INTO public.newsletter_subscribers (email, is_active)
  VALUES (NEW.email, true)
  ON CONFLICT (email) DO UPDATE SET is_active = true, unsubscribed_at = NULL;

  -- Process referral code if present
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

  RETURN NEW;
END;
$$;
