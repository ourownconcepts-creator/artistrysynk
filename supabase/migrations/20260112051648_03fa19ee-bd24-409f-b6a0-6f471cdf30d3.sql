-- Create service_reviews table for marketplace ratings
CREATE TABLE public.service_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);

-- Enable RLS
ALTER TABLE public.service_reviews ENABLE ROW LEVEL SECURITY;

-- Policies for service_reviews
CREATE POLICY "Anyone can view reviews"
  ON public.service_reviews
  FOR SELECT
  USING (true);

CREATE POLICY "Buyers can create reviews for their completed orders"
  ON public.service_reviews
  FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Reviewers can update their own reviews"
  ON public.service_reviews
  FOR UPDATE
  USING (auth.uid() = reviewer_id);

CREATE POLICY "Reviewers can delete their own reviews"
  ON public.service_reviews
  FOR DELETE
  USING (auth.uid() = reviewer_id);

-- Add average_rating column to services table
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS average_rating DECIMAL(2,1) DEFAULT 0;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- Create function to update service rating when review is added/updated/deleted
CREATE OR REPLACE FUNCTION public.update_service_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.services
    SET 
      average_rating = COALESCE((SELECT AVG(rating)::DECIMAL(2,1) FROM public.service_reviews WHERE service_id = OLD.service_id), 0),
      total_reviews = (SELECT COUNT(*) FROM public.service_reviews WHERE service_id = OLD.service_id)
    WHERE id = OLD.service_id;
    RETURN OLD;
  ELSE
    UPDATE public.services
    SET 
      average_rating = COALESCE((SELECT AVG(rating)::DECIMAL(2,1) FROM public.service_reviews WHERE service_id = NEW.service_id), 0),
      total_reviews = (SELECT COUNT(*) FROM public.service_reviews WHERE service_id = NEW.service_id)
    WHERE id = NEW.service_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic rating updates
CREATE TRIGGER update_service_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.service_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_service_rating();