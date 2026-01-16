-- Create content flags table for user reports
CREATE TABLE public.content_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_flags ENABLE ROW LEVEL SECURITY;

-- Users can create flags
CREATE POLICY "Users can create content flags"
ON public.content_flags
FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own flags
CREATE POLICY "Users can view their own flags"
ON public.content_flags
FOR SELECT
USING (auth.uid() = reporter_id);

-- Admins can view all flags
CREATE POLICY "Admins can view all content flags"
ON public.content_flags
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'master_admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- Admins can update flags
CREATE POLICY "Admins can update content flags"
ON public.content_flags
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'master_admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- Admins can delete flags
CREATE POLICY "Admins can delete content flags"
ON public.content_flags
FOR DELETE
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Create indexes
CREATE INDEX idx_content_flags_status ON public.content_flags(status);
CREATE INDEX idx_content_flags_content ON public.content_flags(content_type, content_id);
CREATE INDEX idx_content_flags_reporter ON public.content_flags(reporter_id);

-- Add updated_at trigger
CREATE TRIGGER update_content_flags_updated_at
BEFORE UPDATE ON public.content_flags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for content flags
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_flags;