
-- Add new creative role enum values
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'singer';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'rapper';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'dj';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'sound_engineer';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'beatmaker';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'vocal_coach';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'filmmaker';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'video_editor';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'cinematographer';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'animator';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'motion_designer';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'podcaster';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'voiceover_artist';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'graphic_designer';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'illustrator';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'model';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'stylist';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'makeup_artist';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'writer';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'creative_director';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'choreographer';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'fashion_designer';

-- Create referrals table
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid,
  referral_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referrals"
ON public.referrals FOR SELECT TO authenticated
USING (auth.uid() = referrer_id);

CREATE POLICY "Users can create referrals"
ON public.referrals FOR INSERT TO authenticated
WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "System can update referrals"
ON public.referrals FOR UPDATE TO authenticated
USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Create collaboration_requests table
CREATE TABLE public.collaboration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  project_title text NOT NULL,
  project_type text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.collaboration_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their collaboration requests"
ON public.collaboration_requests FOR SELECT TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create collaboration requests"
ON public.collaboration_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can update collaboration requests"
ON public.collaboration_requests FOR UPDATE TO authenticated
USING (auth.uid() = recipient_id OR auth.uid() = sender_id);
