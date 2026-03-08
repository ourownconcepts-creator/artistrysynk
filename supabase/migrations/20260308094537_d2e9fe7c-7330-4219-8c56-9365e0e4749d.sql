
-- Create the process_referral_rewards function
CREATE OR REPLACE FUNCTION public.process_referral_rewards()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  referrer UUID;
  completed_count INTEGER;
BEGIN
  -- Only process when status changes to completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
    referrer := NEW.referrer_id;
    
    -- Count total completed referrals for this referrer
    SELECT COUNT(*) INTO completed_count
    FROM public.referrals
    WHERE referrer_id = referrer AND status = 'completed';
    
    -- 3 referrals: 7-day Featured Profile Boost
    IF completed_count = 3 THEN
      UPDATE public.profiles 
      SET is_featured = true, featured_until = now() + interval '7 days'
      WHERE id = referrer;
      
      INSERT INTO public.user_notifications (user_id, type, title, message, data)
      VALUES (referrer, 'referral_reward', '🎉 Reward Unlocked: Featured Boost!', 
        'Your profile is now featured for 7 days! Thanks for referring 3 creators.',
        jsonb_build_object('reward', 'featured_boost', 'referral_count', 3));
    END IF;
    
    -- 10 referrals: Permanent Verified Badge
    IF completed_count = 10 THEN
      UPDATE public.profiles SET is_verified = true WHERE id = referrer;
      
      INSERT INTO public.user_notifications (user_id, type, title, message, data)
      VALUES (referrer, 'referral_reward', '🏆 Reward Unlocked: Verified Badge!', 
        'You earned a permanent Verified Badge for referring 10 creators!',
        jsonb_build_object('reward', 'verified_badge', 'referral_count', 10));
    END IF;
    
    -- 25 referrals: 30-day Homepage Feature
    IF completed_count = 25 THEN
      INSERT INTO public.featured_creatives (user_id, reason, is_active, end_date)
      VALUES (referrer, 'Referral milestone: 25 referrals', true, now() + interval '30 days');
      
      INSERT INTO public.user_notifications (user_id, type, title, message, data)
      VALUES (referrer, 'referral_reward', '⭐ Reward Unlocked: Homepage Feature!', 
        'You are now featured on the homepage for 30 days! 25 referrals achieved.',
        jsonb_build_object('reward', 'homepage_feature', 'referral_count', 25));
    END IF;
    
    -- 50 referrals: 60-day Platform Spotlight + Synergy Boost
    IF completed_count = 50 THEN
      INSERT INTO public.featured_creatives (user_id, reason, is_active, end_date)
      VALUES (referrer, 'Referral milestone: 50 referrals - Platform Spotlight', true, now() + interval '60 days');
      
      UPDATE public.profiles 
      SET synergy_boost_score = COALESCE(synergy_boost_score, 0) + 20 
      WHERE id = referrer;
      
      INSERT INTO public.user_notifications (user_id, type, title, message, data)
      VALUES (referrer, 'referral_reward', '👑 Reward Unlocked: Platform Spotlight!', 
        'You earned a 60-day Platform Spotlight and Synergy Boost for 50 referrals!',
        jsonb_build_object('reward', 'platform_spotlight', 'referral_count', 50));
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on referrals table for automatic rewards
CREATE TRIGGER on_referral_completed
  AFTER UPDATE ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.process_referral_rewards();

-- Also create all missing triggers that have functions but no triggers attached

-- Trigger for checking mutual likes and creating matches
DROP TRIGGER IF EXISTS on_swipe_check_match ON public.swipes;
CREATE TRIGGER on_swipe_check_match
  AFTER INSERT ON public.swipes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_mutual_like();

-- Trigger for creating conversation on match
DROP TRIGGER IF EXISTS on_match_create_conversation ON public.matches;
CREATE TRIGGER on_match_create_conversation
  AFTER INSERT ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.create_conversation_on_match();

-- Trigger for match notifications
DROP TRIGGER IF EXISTS on_match_notify ON public.matches;
CREATE TRIGGER on_match_notify
  AFTER INSERT ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_match();

-- Trigger for new message notifications
DROP TRIGGER IF EXISTS on_message_notify ON public.messages;
CREATE TRIGGER on_message_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_notify_new_message();

-- Trigger for content flag auto-hide
DROP TRIGGER IF EXISTS on_content_flag_check ON public.content_flags;
CREATE TRIGGER on_content_flag_check
  AFTER INSERT ON public.content_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_hide_flagged_content();

-- Trigger for unhiding content on flag dismissal
DROP TRIGGER IF EXISTS on_content_flag_resolve ON public.content_flags;
CREATE TRIGGER on_content_flag_resolve
  AFTER UPDATE ON public.content_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.unhide_content_on_flag_resolution();

-- Trigger for updating service ratings
DROP TRIGGER IF EXISTS on_review_update_rating ON public.service_reviews;
CREATE TRIGGER on_review_update_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.service_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_service_rating();

-- Trigger for project activity logging on tasks
DROP TRIGGER IF EXISTS on_task_log_activity ON public.project_tasks;
CREATE TRIGGER on_task_log_activity
  AFTER INSERT OR UPDATE ON public.project_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.log_project_activity();

-- Trigger for project activity logging on files
DROP TRIGGER IF EXISTS on_file_log_activity ON public.project_files;
CREATE TRIGGER on_file_log_activity
  AFTER INSERT ON public.project_files
  FOR EACH ROW
  EXECUTE FUNCTION public.log_project_activity();

-- Trigger for project application notifications
DROP TRIGGER IF EXISTS on_project_application_notify ON public.project_applications;
CREATE TRIGGER on_project_application_notify
  AFTER INSERT ON public.project_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_project_application();

-- Trigger for project application status change notifications
DROP TRIGGER IF EXISTS on_application_status_notify ON public.project_applications;
CREATE TRIGGER on_application_status_notify
  AFTER UPDATE ON public.project_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_application_status_change();

-- Trigger for default subscription on profile creation
DROP TRIGGER IF EXISTS on_profile_create_subscription ON public.profiles;
CREATE TRIGGER on_profile_create_subscription
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_subscription();

-- Trigger for suspension notifications
DROP TRIGGER IF EXISTS on_suspension_notify ON public.user_suspensions;
CREATE TRIGGER on_suspension_notify
  AFTER INSERT ON public.user_suspensions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_notify_suspension();

-- Trigger for verification request notifications
DROP TRIGGER IF EXISTS on_verification_request_notify ON public.verification_requests;
CREATE TRIGGER on_verification_request_notify
  AFTER INSERT ON public.verification_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_notify_verification_request();

-- Updated_at trigger for tables that need it
DROP TRIGGER IF EXISTS update_services_updated_at ON public.services;
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_collaboration_requests_updated_at ON public.collaboration_requests;
CREATE TRIGGER update_collaboration_requests_updated_at
  BEFORE UPDATE ON public.collaboration_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
