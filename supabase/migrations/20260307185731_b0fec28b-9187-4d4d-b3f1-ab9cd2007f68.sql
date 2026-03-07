
-- Add phone column to contact_submissions for lead tracking
ALTER TABLE public.contact_submissions ADD COLUMN IF NOT EXISTS phone text;
