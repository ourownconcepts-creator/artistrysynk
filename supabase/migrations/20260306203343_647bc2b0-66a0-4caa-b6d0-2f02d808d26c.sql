
-- Create storage bucket for verification ID documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-documents', 'verification-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Users can upload their own verification documents
CREATE POLICY "Users can upload verification documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'verification-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: Users can view their own verification documents
CREATE POLICY "Users can view own verification documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'verification-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: Admins can view all verification documents
CREATE POLICY "Admins can view all verification documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'verification-documents' AND (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'master_admin', 'super_admin'))
));
