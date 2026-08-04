ALTER TABLE public.services ADD COLUMN IF NOT EXISTS subcategory text;
CREATE INDEX IF NOT EXISTS idx_services_category_subcategory ON public.services (category, subcategory);