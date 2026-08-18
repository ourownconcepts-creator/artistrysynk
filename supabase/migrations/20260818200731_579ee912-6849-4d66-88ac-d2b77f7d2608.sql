ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'nail_technician';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'nail_artist';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'lash_technician';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'brow_artist';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'hair_stylist';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'barber';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'wig_maker';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'braider';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'sfx_makeup_artist';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'body_painter';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'esthetician';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'skincare_specialist';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'tattoo_artist';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'piercing_artist';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'beauty_content_creator';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'pedicurist';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'wardrobe_stylist';

CREATE TABLE IF NOT EXISTS public.custom_role_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_role text NOT NULL,
  category text NOT NULL DEFAULT 'Beauty & Grooming',
  description text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.custom_role_requests TO authenticated;
GRANT UPDATE ON public.custom_role_requests TO authenticated;
GRANT ALL ON public.custom_role_requests TO service_role;
ALTER TABLE public.custom_role_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own role requests"
  ON public.custom_role_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Users can view own role requests"
  ON public.custom_role_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all role requests"
  ON public.custom_role_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master_admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins can decide role requests"
  ON public.custom_role_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master_admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master_admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER custom_role_requests_updated_at
  BEFORE UPDATE ON public.custom_role_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_custom_role_requests_status ON public.custom_role_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_custom_role_requests_user ON public.custom_role_requests(user_id);

ALTER TABLE public.portfolio_items
  ADD COLUMN IF NOT EXISTS before_media_url text,
  ADD COLUMN IF NOT EXISTS after_media_url text,
  ADD COLUMN IF NOT EXISTS is_transformation boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS captured_on date;

CREATE TABLE IF NOT EXISTS public.beauty_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  specialties text[] NOT NULL DEFAULT '{}',
  services jsonb NOT NULL DEFAULT '[]'::jsonb,
  price_min numeric,
  price_max numeric,
  currency text NOT NULL DEFAULT 'USD',
  service_modes text[] NOT NULL DEFAULT '{}',
  service_areas text[] NOT NULL DEFAULT '{}',
  travel_radius_km integer,
  years_experience integer,
  booking_url text,
  is_accepting_clients boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.beauty_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.beauty_profiles TO authenticated;
GRANT ALL ON public.beauty_profiles TO service_role;
ALTER TABLE public.beauty_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Beauty details are publicly viewable"
  ON public.beauty_profiles FOR SELECT
  USING (true);

CREATE POLICY "Users manage own beauty details"
  ON public.beauty_profiles FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER beauty_profiles_updated_at
  BEFORE UPDATE ON public.beauty_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_beauty_profiles_specialties ON public.beauty_profiles USING gin(specialties);
CREATE INDEX IF NOT EXISTS idx_beauty_profiles_areas ON public.beauty_profiles USING gin(service_areas);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS professional_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS professional_verified_at timestamptz;

CREATE OR REPLACE FUNCTION public.sync_professional_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.request_type IN ('professional_credential', 'beauty_credential')
     AND NEW.status = 'approved'
     AND COALESCE(OLD.status, '') <> 'approved' THEN
    UPDATE public.profiles
       SET professional_verified = true,
           professional_verified_at = now()
     WHERE id = NEW.user_id;
  ELSIF NEW.request_type IN ('professional_credential', 'beauty_credential')
     AND NEW.status = 'rejected' THEN
    UPDATE public.profiles
       SET professional_verified = false,
           professional_verified_at = NULL
     WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_professional_verification_trigger ON public.verification_requests;
CREATE TRIGGER sync_professional_verification_trigger
  AFTER UPDATE ON public.verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.sync_professional_verification();

INSERT INTO public.verification_requirements (level, doc_type, label, description, is_required, accepted_mime, max_size_mb, sort_order)
VALUES
  ('professional', 'beauty_certification', 'Beauty certification', 'A certificate from a beauty school, academy or training programme (nails, lashes, hair, makeup, skincare).', true, ARRAY['image/jpeg','image/png','image/webp','application/pdf'], 10, 1),
  ('professional', 'beauty_license', 'Practice licence', 'A cosmetology, esthetician or salon licence issued in your country or state.', false, ARRAY['image/jpeg','image/png','image/webp','application/pdf'], 10, 2),
  ('professional', 'business_proof', 'Business or salon proof', 'Business registration, salon lease or a photo of your workspace signage.', false, ARRAY['image/jpeg','image/png','image/webp','application/pdf'], 10, 3)
ON CONFLICT DO NOTHING;