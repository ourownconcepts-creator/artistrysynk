
-- Function to complete a referral when a referred user signs up
CREATE OR REPLACE FUNCTION public.complete_referral_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ref_code TEXT;
  referral_row_id UUID;
BEGIN
  ref_code := NEW.raw_user_meta_data->>'referral_code';
  
  IF ref_code IS NOT NULL AND ref_code <> '' THEN
    -- Find one active referral row
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
    ELSE
      -- Create a completed referral from existing code
      INSERT INTO public.referrals (referrer_id, referred_id, referral_code, status, completed_at)
      SELECT r.referrer_id, NEW.id, ref_code, 'completed', now()
      FROM public.referrals r
      WHERE r.referral_code = ref_code
      LIMIT 1
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;
