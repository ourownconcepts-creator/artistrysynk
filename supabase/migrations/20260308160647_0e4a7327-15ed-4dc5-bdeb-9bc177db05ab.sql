
-- Fix overly permissive INSERT policies

-- 1. career_applications: require fields
DROP POLICY IF EXISTS "Anyone can submit career applications" ON public.career_applications;
CREATE POLICY "Anyone can submit career applications"
  ON public.career_applications FOR INSERT
  WITH CHECK (
    full_name IS NOT NULL AND full_name <> '' AND
    email IS NOT NULL AND email <> '' AND
    cover_letter IS NOT NULL AND cover_letter <> ''
  );

-- 2. contact_submissions: require fields
DROP POLICY IF EXISTS "Anyone can submit contact form" ON public.contact_submissions;
CREATE POLICY "Anyone can submit contact form"
  ON public.contact_submissions FOR INSERT
  WITH CHECK (
    name IS NOT NULL AND name <> '' AND
    email IS NOT NULL AND email <> '' AND
    message IS NOT NULL AND message <> ''
  );

-- 3. newsletter_subscribers: require valid email
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscribers;
CREATE POLICY "Anyone can subscribe to newsletter"
  ON public.newsletter_subscribers FOR INSERT
  WITH CHECK (
    email IS NOT NULL AND email <> '' AND
    email LIKE '%@%.%'
  );
