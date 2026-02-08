-- Update the handle_new_user function to also subscribe users to the newsletter
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  RETURN NEW;
END;
$$;