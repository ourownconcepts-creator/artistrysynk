CREATE TABLE public.og_image_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  image_url text,
  square_url text,
  portrait_url text,
  version text NOT NULL DEFAULT to_char(now(), 'YYYYMMDDHH24MISS'),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.og_image_settings (id) VALUES (true);

GRANT SELECT ON public.og_image_settings TO anon;
GRANT SELECT ON public.og_image_settings TO authenticated;
GRANT ALL ON public.og_image_settings TO service_role;
ALTER TABLE public.og_image_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "og settings readable by everyone" ON public.og_image_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "og settings writable by admins" ON public.og_image_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TABLE public.og_image_overrides (
  path text PRIMARY KEY,
  image_url text NOT NULL,
  square_url text,
  portrait_url text,
  version text NOT NULL DEFAULT to_char(now(), 'YYYYMMDDHH24MISS'),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.og_image_overrides TO anon;
GRANT SELECT ON public.og_image_overrides TO authenticated;
GRANT ALL ON public.og_image_overrides TO service_role;
ALTER TABLE public.og_image_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "og overrides readable by everyone" ON public.og_image_overrides FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "og overrides manageable by admins" ON public.og_image_overrides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));