-- 1. Optional owning studio on the canonical services table.
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS studio_id uuid NULL REFERENCES public.studios(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_services_studio_id ON public.services (studio_id) WHERE studio_id IS NOT NULL;

-- 2. Extend the canonical studio capability matrix (role ceiling stays authoritative).
CREATE OR REPLACE FUNCTION public.studio_role_capability(_role studio_role, _capability text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE _capability
    WHEN 'manage_studio'        THEN _role IN ('owner','admin')
    WHEN 'manage_members'       THEN _role IN ('owner','admin')
    WHEN 'manage_equipment'     THEN _role IN ('owner','admin','manager','staff')
    WHEN 'manage_portfolio'     THEN _role IN ('owner','admin','manager','staff','contributor')
    WHEN 'delete_portfolio'     THEN _role IN ('owner','admin','manager')
    WHEN 'delete_equipment'     THEN _role IN ('owner','admin','manager')
    WHEN 'manage_services'      THEN _role IN ('owner','admin','manager')
    WHEN 'delete_services'      THEN _role IN ('owner','admin')
    WHEN 'request_verification' THEN _role IN ('owner','admin')
    WHEN 'view_analytics'       THEN _role IN ('owner','admin','manager')
    WHEN 'delete_studio'        THEN _role = 'owner'
    ELSE false
  END
$function$;

-- 3. The responsible human on a studio service must be an active member of that studio.
CREATE OR REPLACE FUNCTION public.validate_studio_service()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.studio_id IS NOT NULL AND NOT public.is_studio_member(NEW.seller_id, NEW.studio_id) THEN
    RAISE EXCEPTION 'The responsible seller must be an active member of the studio';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_studio_service() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_studio_service() FROM anon, authenticated;

DROP TRIGGER IF EXISTS validate_studio_service_trg ON public.services;
CREATE TRIGGER validate_studio_service_trg
  BEFORE INSERT OR UPDATE OF studio_id, seller_id ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.validate_studio_service();

-- 4. RLS. Personal-service behaviour is preserved; it is only scoped to studio_id IS NULL
--    so studio-owned rows are governed exclusively by the studio capability matrix.
DROP POLICY IF EXISTS "Users can manage their own services" ON public.services;
CREATE POLICY "Users can manage their own personal services"
  ON public.services FOR ALL
  USING (auth.uid() = seller_id AND studio_id IS NULL)
  WITH CHECK (auth.uid() = seller_id AND studio_id IS NULL);

-- Public discovery: unchanged for personal services; studio services additionally
-- require the studio to be live, public and not hidden.
DROP POLICY IF EXISTS "Everyone can view active services" ON public.services;
CREATE POLICY "Everyone can view active services"
  ON public.services FOR SELECT
  USING (
    is_active = true
    AND (
      studio_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.studios s
        WHERE s.id = services.studio_id
          AND s.is_active = true
          AND s.is_hidden = false
          AND s.visibility = 'public'
      )
    )
  );

-- Studio members can always read their own studio's services (including unpublished).
CREATE POLICY "Studio members can view their studio services"
  ON public.services FOR SELECT
  TO authenticated
  USING (studio_id IS NOT NULL AND public.is_studio_member(auth.uid(), studio_id));

CREATE POLICY "Studio managers create studio services"
  ON public.services FOR INSERT
  TO authenticated
  WITH CHECK (
    studio_id IS NOT NULL
    AND seller_id = auth.uid()
    AND public.has_studio_capability(auth.uid(), studio_id, 'manage_services')
  );

CREATE POLICY "Studio managers update studio services"
  ON public.services FOR UPDATE
  TO authenticated
  USING (studio_id IS NOT NULL AND public.has_studio_capability(auth.uid(), studio_id, 'manage_services'))
  WITH CHECK (studio_id IS NOT NULL AND public.has_studio_capability(auth.uid(), studio_id, 'manage_services'));

CREATE POLICY "Studio managers delete studio services"
  ON public.services FOR DELETE
  TO authenticated
  USING (studio_id IS NOT NULL AND public.has_studio_capability(auth.uid(), studio_id, 'delete_services'));