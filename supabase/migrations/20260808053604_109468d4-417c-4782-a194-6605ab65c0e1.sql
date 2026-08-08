CREATE TABLE public.function_run_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'success',
  duration_ms INTEGER,
  error_message TEXT,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_function_run_logs_created_at ON public.function_run_logs (created_at DESC);
CREATE INDEX idx_function_run_logs_name ON public.function_run_logs (function_name);
CREATE INDEX idx_function_run_logs_status ON public.function_run_logs (status);

GRANT SELECT ON public.function_run_logs TO authenticated;
GRANT ALL ON public.function_run_logs TO service_role;

ALTER TABLE public.function_run_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view function run logs"
ON public.function_run_logs
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'master_admin')
  OR public.has_role(auth.uid(), 'super_admin')
);