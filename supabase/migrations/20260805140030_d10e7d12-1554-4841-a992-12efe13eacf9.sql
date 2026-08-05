CREATE TABLE public.service_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label text NOT NULL UNIQUE,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.service_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_categories TO authenticated;
GRANT ALL ON public.service_categories TO service_role;

ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view service categories"
  ON public.service_categories FOR SELECT USING (true);

CREATE POLICY "Admins can manage service categories"
  ON public.service_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master_admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master_admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_service_categories_updated_at
  BEFORE UPDATE ON public.service_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.service_subcategories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_label text NOT NULL REFERENCES public.service_categories(label) ON UPDATE CASCADE ON DELETE CASCADE,
  label text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (category_label, label)
);

CREATE INDEX idx_service_subcategories_category ON public.service_subcategories(category_label);

GRANT SELECT ON public.service_subcategories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_subcategories TO authenticated;
GRANT ALL ON public.service_subcategories TO service_role;

ALTER TABLE public.service_subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view service subcategories"
  ON public.service_subcategories FOR SELECT USING (true);

CREATE POLICY "Admins can manage service subcategories"
  ON public.service_subcategories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master_admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master_admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_service_subcategories_updated_at
  BEFORE UPDATE ON public.service_subcategories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.service_categories (label, sort_order) VALUES
  ('Music Production', 1),
  ('Mixing & Mastering', 2),
  ('Songwriting', 3),
  ('Video Production', 4),
  ('Photography', 5),
  ('Graphic Design', 6),
  ('Social Media Management', 7),
  ('Artist Management', 8),
  ('Promotion', 9),
  ('Other', 10)
ON CONFLICT (label) DO NOTHING;

INSERT INTO public.service_categories (label, sort_order)
SELECT DISTINCT s.category, 100
FROM public.services s
WHERE s.category IS NOT NULL AND s.category <> ''
ON CONFLICT (label) DO NOTHING;

INSERT INTO public.service_subcategories (category_label, label, sort_order) VALUES
  ('Music Production', 'Beat Making', 1),
  ('Music Production', 'Instrumentals', 2),
  ('Music Production', 'Session Musician', 3),
  ('Music Production', 'Topline & Melody', 4),
  ('Music Production', 'Vocal Production', 5),
  ('Music Production', 'Arrangement', 6),
  ('Mixing & Mastering', 'Mixing', 1),
  ('Mixing & Mastering', 'Mastering', 2),
  ('Mixing & Mastering', 'Stem Mastering', 3),
  ('Mixing & Mastering', 'Vocal Tuning', 4),
  ('Mixing & Mastering', 'Audio Restoration', 5),
  ('Mixing & Mastering', 'Dolby Atmos Mix', 6),
  ('Songwriting', 'Lyric Writing', 1),
  ('Songwriting', 'Ghostwriting', 2),
  ('Songwriting', 'Rap Verses', 3),
  ('Songwriting', 'Hooks & Choruses', 4),
  ('Songwriting', 'Jingles', 5),
  ('Songwriting', 'Translation & Adaptation', 6),
  ('Video Production', 'Music Video', 1),
  ('Video Production', 'Video Editing', 2),
  ('Video Production', 'Motion Graphics', 3),
  ('Video Production', 'Colour Grading', 4),
  ('Video Production', 'Lyric Video', 5),
  ('Video Production', 'Animation', 6),
  ('Photography', 'Artist Portraits', 1),
  ('Photography', 'Event Coverage', 2),
  ('Photography', 'Cover Art Shoot', 3),
  ('Photography', 'Product Photography', 4),
  ('Photography', 'Photo Retouching', 5),
  ('Graphic Design', 'Cover Art', 1),
  ('Graphic Design', 'Logo & Branding', 2),
  ('Graphic Design', 'Merch Design', 3),
  ('Graphic Design', 'Flyers & Posters', 4),
  ('Graphic Design', 'Press Kit Design', 5),
  ('Graphic Design', 'Thumbnails', 6),
  ('Social Media Management', 'Content Strategy', 1),
  ('Social Media Management', 'Content Creation', 2),
  ('Social Media Management', 'Community Management', 3),
  ('Social Media Management', 'Short-Form Editing', 4),
  ('Social Media Management', 'Paid Ads', 5),
  ('Artist Management', 'Career Strategy', 1),
  ('Artist Management', 'Booking & Touring', 2),
  ('Artist Management', 'Release Planning', 3),
  ('Artist Management', 'A&R Consulting', 4),
  ('Artist Management', 'Contract Review', 5),
  ('Promotion', 'Playlist Pitching', 1),
  ('Promotion', 'Press & PR', 2),
  ('Promotion', 'Radio Plugging', 3),
  ('Promotion', 'Influencer Campaigns', 4),
  ('Promotion', 'Blog Placement', 5),
  ('Other', 'Consultation', 1),
  ('Other', 'Voiceover', 2),
  ('Other', 'Podcast Production', 3),
  ('Other', 'Web & App Development', 4),
  ('Other', 'Custom Request', 5)
ON CONFLICT (category_label, label) DO NOTHING;

INSERT INTO public.service_subcategories (category_label, label, sort_order)
SELECT DISTINCT s.category, s.subcategory, 100
FROM public.services s
WHERE s.subcategory IS NOT NULL AND s.subcategory <> ''
  AND s.category IS NOT NULL AND s.category <> ''
ON CONFLICT (category_label, label) DO NOTHING;

CREATE OR REPLACE FUNCTION public.validate_service_taxonomy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.category IS NULL OR btrim(NEW.category) = '' THEN
    RAISE EXCEPTION 'A service must belong to a category';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.service_categories c
    WHERE c.label = NEW.category AND c.is_active = true
  ) THEN
    RAISE EXCEPTION 'Invalid service category: %', NEW.category;
  END IF;

  IF NEW.subcategory IS NOT NULL AND btrim(NEW.subcategory) <> '' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.service_subcategories sc
      WHERE sc.label = NEW.subcategory
        AND sc.category_label = NEW.category
        AND sc.is_active = true
    ) THEN
      RAISE EXCEPTION 'Subcategory "%" does not belong to category "%"', NEW.subcategory, NEW.category;
    END IF;
  ELSE
    NEW.subcategory := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_service_taxonomy_trigger
  BEFORE INSERT OR UPDATE OF category, subcategory ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.validate_service_taxonomy();