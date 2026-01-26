-- Drop the restrictive check constraint
ALTER TABLE public.verification_requests DROP CONSTRAINT verification_requests_request_type_check;

-- Add a more flexible check constraint that includes all the types used in the frontend
ALTER TABLE public.verification_requests ADD CONSTRAINT verification_requests_request_type_check 
CHECK (request_type = ANY (ARRAY['artist'::text, 'producer'::text, 'label'::text, 'identity'::text, 'professional'::text, 'portfolio'::text]));