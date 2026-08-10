DROP POLICY IF EXISTS "Owners create their studio" ON public.studios;

CREATE POLICY "Entitled owners create one studio"
ON public.studios FOR INSERT TO authenticated
WITH CHECK (
  owner_id = auth.uid()
  AND public.has_studio_entitlement(auth.uid())
  AND NOT EXISTS (SELECT 1 FROM public.studios s WHERE s.owner_id = auth.uid())
);

CREATE OR REPLACE FUNCTION public.guard_studio_protected_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role / SECURITY DEFINER admin paths bypass this guard.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified
     AND NOT (
       has_role(auth.uid(), 'admin'::app_role)
       OR has_role(auth.uid(), 'master_admin'::app_role)
       OR has_role(auth.uid(), 'super_admin'::app_role)
     ) THEN
    RAISE EXCEPTION 'Verification is granted through review, not directly';
  END IF;

  IF (NEW.owner_id IS DISTINCT FROM OLD.owner_id OR NEW.is_active IS DISTINCT FROM OLD.is_active)
     AND auth.uid() <> OLD.owner_id
     AND NOT (
       has_role(auth.uid(), 'admin'::app_role)
       OR has_role(auth.uid(), 'master_admin'::app_role)
       OR has_role(auth.uid(), 'super_admin'::app_role)
     ) THEN
    RAISE EXCEPTION 'Only the studio owner can change ownership or activation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_studio_protected_fields ON public.studios;
CREATE TRIGGER guard_studio_protected_fields
BEFORE UPDATE ON public.studios
FOR EACH ROW EXECUTE FUNCTION public.guard_studio_protected_fields();
