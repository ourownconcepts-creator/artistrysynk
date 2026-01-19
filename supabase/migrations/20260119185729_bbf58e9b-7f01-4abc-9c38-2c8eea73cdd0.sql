-- Create content appeals table
CREATE TABLE public.content_appeals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content_type TEXT NOT NULL,
  content_id TEXT NOT NULL,
  appeal_reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_appeals ENABLE ROW LEVEL SECURITY;

-- Users can view their own appeals
CREATE POLICY "Users can view their own appeals"
ON public.content_appeals
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create appeals for their own hidden content
CREATE POLICY "Users can create appeals"
ON public.content_appeals
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all appeals
CREATE POLICY "Admins can view all appeals"
ON public.content_appeals
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'master_admin', 'super_admin')
  )
);

-- Admins can update appeals
CREATE POLICY "Admins can update appeals"
ON public.content_appeals
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'master_admin', 'super_admin')
  )
);

-- Create index for faster lookups
CREATE INDEX idx_content_appeals_user_id ON public.content_appeals(user_id);
CREATE INDEX idx_content_appeals_status ON public.content_appeals(status);
CREATE INDEX idx_content_appeals_content ON public.content_appeals(content_type, content_id);

-- Trigger for updated_at
CREATE TRIGGER update_content_appeals_updated_at
BEFORE UPDATE ON public.content_appeals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for appeals
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_appeals;