-- ============================================================
-- STUDIO V1.5 — PHASE 0/1: capabilities, commerce attribution
-- ============================================================

-- 0a. Capability matrix: add manage_inbox + represent_studio
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
    WHEN 'manage_inbox'         THEN _role IN ('owner','admin','manager','booking_manager')
    WHEN 'represent_studio'     THEN _role IN ('owner','admin')
    WHEN 'request_verification' THEN _role IN ('owner','admin')
    WHEN 'view_analytics'       THEN _role IN ('owner','admin','manager')
    WHEN 'delete_studio'        THEN _role = 'owner'
    ELSE false
  END
$function$;

-- 0b. Grant hygiene: anon has no write path to these tables
REVOKE INSERT, UPDATE, DELETE ON public.service_orders FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.service_reviews FROM anon;
REVOKE INSERT, UPDATE, DELETE, SELECT ON public.revenue_transactions FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.conversations FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.messages FROM anon;

-- 1a. Attribution columns
ALTER TABLE public.service_orders
  ADD COLUMN IF NOT EXISTS studio_id uuid REFERENCES public.studios(id) ON DELETE SET NULL;
ALTER TABLE public.service_reviews
  ADD COLUMN IF NOT EXISTS studio_id uuid REFERENCES public.studios(id) ON DELETE SET NULL;
ALTER TABLE public.revenue_transactions
  ADD COLUMN IF NOT EXISTS studio_id uuid REFERENCES public.studios(id) ON DELETE SET NULL;

-- 1b. Backfill from the owning service (historical truth)
UPDATE public.service_orders o
   SET studio_id = s.studio_id
  FROM public.services s
 WHERE s.id = o.service_id
   AND o.studio_id IS NULL
   AND s.studio_id IS NOT NULL;

UPDATE public.service_reviews r
   SET studio_id = o.studio_id
  FROM public.service_orders o
 WHERE o.id = r.order_id
   AND r.studio_id IS NULL
   AND o.studio_id IS NOT NULL;

-- 1c. Server-derived, immutable attribution (client input is ignored)
CREATE OR REPLACE FUNCTION public.set_order_studio_attribution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _studio uuid;
BEGIN
  SELECT s.studio_id INTO _studio FROM public.services s WHERE s.id = NEW.service_id;

  IF TG_OP = 'INSERT' THEN
    NEW.studio_id := _studio;
  ELSIF NEW.studio_id IS DISTINCT FROM OLD.studio_id THEN
    RAISE EXCEPTION 'service_orders.studio_id is immutable';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_service_orders_studio_attribution ON public.service_orders;
CREATE TRIGGER trg_service_orders_studio_attribution
  BEFORE INSERT OR UPDATE ON public.service_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_order_studio_attribution();

CREATE OR REPLACE FUNCTION public.set_review_studio_attribution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _studio uuid;
BEGIN
  SELECT o.studio_id INTO _studio FROM public.service_orders o WHERE o.id = NEW.order_id;
  IF _studio IS NULL THEN
    SELECT s.studio_id INTO _studio FROM public.services s WHERE s.id = NEW.service_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.studio_id := _studio;
  ELSIF NEW.studio_id IS DISTINCT FROM OLD.studio_id THEN
    RAISE EXCEPTION 'service_reviews.studio_id is immutable';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_service_reviews_studio_attribution ON public.service_reviews;
CREATE TRIGGER trg_service_reviews_studio_attribution
  BEFORE INSERT OR UPDATE ON public.service_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_review_studio_attribution();

-- 1d. RLS: additive studio branches only
DROP POLICY IF EXISTS "Studio team can view studio orders" ON public.service_orders;
CREATE POLICY "Studio team can view studio orders"
  ON public.service_orders FOR SELECT TO authenticated
  USING (studio_id IS NOT NULL AND public.has_studio_capability(auth.uid(), studio_id, 'view_analytics'));

DROP POLICY IF EXISTS "Studio team can update studio orders" ON public.service_orders;
CREATE POLICY "Studio team can update studio orders"
  ON public.service_orders FOR UPDATE TO authenticated
  USING (studio_id IS NOT NULL AND public.has_studio_capability(auth.uid(), studio_id, 'manage_services'))
  WITH CHECK (studio_id IS NOT NULL AND public.has_studio_capability(auth.uid(), studio_id, 'manage_services'));

DROP POLICY IF EXISTS "Studio team can view studio revenue" ON public.revenue_transactions;
CREATE POLICY "Studio team can view studio revenue"
  ON public.revenue_transactions FOR SELECT TO authenticated
  USING (studio_id IS NOT NULL AND public.has_studio_capability(auth.uid(), studio_id, 'view_analytics'));

-- 1e. Indexes
CREATE INDEX IF NOT EXISTS idx_service_orders_studio_created
  ON public.service_orders (studio_id, created_at DESC) WHERE studio_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_service_orders_studio_status
  ON public.service_orders (studio_id, status) WHERE studio_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_service_reviews_studio
  ON public.service_reviews (studio_id) WHERE studio_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_studio_created
  ON public.revenue_transactions (studio_id, created_at DESC) WHERE studio_id IS NOT NULL;