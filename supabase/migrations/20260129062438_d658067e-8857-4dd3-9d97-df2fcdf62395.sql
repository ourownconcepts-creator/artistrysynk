-- Create scheduled newsletters table
CREATE TABLE public.scheduled_newsletters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  preview_text TEXT,
  audience TEXT NOT NULL DEFAULT 'subscribers' CHECK (audience IN ('subscribers', 'users', 'both')),
  template_id TEXT NOT NULL DEFAULT 'gradient-header',
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  recipients_count INTEGER,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_newsletters ENABLE ROW LEVEL SECURITY;

-- Only admins can manage scheduled newsletters
CREATE POLICY "Admins can view scheduled newsletters"
ON public.scheduled_newsletters
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'master_admin', 'super_admin')
  )
);

CREATE POLICY "Admins can create scheduled newsletters"
ON public.scheduled_newsletters
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'master_admin', 'super_admin')
  )
);

CREATE POLICY "Admins can update scheduled newsletters"
ON public.scheduled_newsletters
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'master_admin', 'super_admin')
  )
);

CREATE POLICY "Admins can delete scheduled newsletters"
ON public.scheduled_newsletters
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'master_admin', 'super_admin')
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_scheduled_newsletters_updated_at
BEFORE UPDATE ON public.scheduled_newsletters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();