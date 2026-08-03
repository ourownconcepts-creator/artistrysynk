CREATE TABLE public.secure_integration_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value text NOT NULL,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.secure_integration_settings TO service_role;

ALTER TABLE public.secure_integration_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No client access to secure integration settings"
ON public.secure_integration_settings
FOR ALL
USING (false)
WITH CHECK (false);

CREATE TRIGGER update_secure_integration_settings_updated_at
BEFORE UPDATE ON public.secure_integration_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();