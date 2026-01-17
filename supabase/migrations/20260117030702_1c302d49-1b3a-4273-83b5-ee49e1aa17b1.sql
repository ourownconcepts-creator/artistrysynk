-- Add is_hidden column to relevant tables for auto-hide functionality
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;
ALTER TABLE public.portfolio_items ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;

-- Create function to auto-hide content when flag count exceeds threshold
CREATE OR REPLACE FUNCTION public.check_and_hide_flagged_content()
RETURNS TRIGGER AS $$
DECLARE
  flag_count INTEGER;
  threshold INTEGER := 3; -- Number of flags before auto-hide
BEGIN
  -- Count pending flags for this content
  SELECT COUNT(*) INTO flag_count
  FROM public.content_flags
  WHERE content_type = NEW.content_type
    AND content_id = NEW.content_id
    AND status = 'pending';

  -- If threshold exceeded, hide the content
  IF flag_count >= threshold THEN
    CASE NEW.content_type
      WHEN 'message' THEN
        UPDATE public.messages SET is_hidden = true WHERE id::text = NEW.content_id;
      WHEN 'portfolio' THEN
        UPDATE public.portfolio_items SET is_hidden = true WHERE id::text = NEW.content_id;
      WHEN 'profile' THEN
        UPDATE public.profiles SET is_hidden = true WHERE id::text = NEW.content_id;
      WHEN 'service' THEN
        UPDATE public.services SET is_hidden = true WHERE id::text = NEW.content_id;
      WHEN 'project' THEN
        UPDATE public.projects SET is_hidden = true WHERE id::text = NEW.content_id;
      ELSE
        NULL;
    END CASE;
    
    -- Update flag status to indicate auto-hidden
    UPDATE public.content_flags 
    SET admin_notes = COALESCE(admin_notes, '') || ' [Auto-hidden due to multiple reports]'
    WHERE content_type = NEW.content_type 
      AND content_id = NEW.content_id 
      AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-hide content after new flag
DROP TRIGGER IF EXISTS trigger_auto_hide_flagged_content ON public.content_flags;
CREATE TRIGGER trigger_auto_hide_flagged_content
AFTER INSERT ON public.content_flags
FOR EACH ROW
EXECUTE FUNCTION public.check_and_hide_flagged_content();

-- Create function to unhide content when flags are resolved
CREATE OR REPLACE FUNCTION public.unhide_content_on_flag_resolution()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run when status changes to dismissed
  IF NEW.status = 'dismissed' AND OLD.status = 'pending' THEN
    CASE NEW.content_type
      WHEN 'message' THEN
        UPDATE public.messages SET is_hidden = false WHERE id::text = NEW.content_id;
      WHEN 'portfolio' THEN
        UPDATE public.portfolio_items SET is_hidden = false WHERE id::text = NEW.content_id;
      WHEN 'profile' THEN
        UPDATE public.profiles SET is_hidden = false WHERE id::text = NEW.content_id;
      WHEN 'service' THEN
        UPDATE public.services SET is_hidden = false WHERE id::text = NEW.content_id;
      WHEN 'project' THEN
        UPDATE public.projects SET is_hidden = false WHERE id::text = NEW.content_id;
      ELSE
        NULL;
    END CASE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to unhide content when dismissed
DROP TRIGGER IF EXISTS trigger_unhide_on_dismiss ON public.content_flags;
CREATE TRIGGER trigger_unhide_on_dismiss
AFTER UPDATE ON public.content_flags
FOR EACH ROW
EXECUTE FUNCTION public.unhide_content_on_flag_resolution();