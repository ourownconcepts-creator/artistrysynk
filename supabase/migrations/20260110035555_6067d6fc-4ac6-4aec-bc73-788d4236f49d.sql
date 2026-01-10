-- Create custom skill tags table for user-defined skills beyond predefined roles
CREATE TABLE public.user_skill_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, skill)
);

-- Enable RLS
ALTER TABLE public.user_skill_tags ENABLE ROW LEVEL SECURITY;

-- Policies for user_skill_tags
CREATE POLICY "Users can view any skill tags"
  ON public.user_skill_tags
  FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own skill tags"
  ON public.user_skill_tags
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own skill tags"
  ON public.user_skill_tags
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create job postings table for paid users
CREATE TABLE public.job_postings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT,
  job_type TEXT NOT NULL DEFAULT 'contract', -- contract, full-time, part-time, gig
  budget_range TEXT,
  required_roles TEXT[] DEFAULT '{}',
  required_skills TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;

-- Policies for job_postings
CREATE POLICY "Anyone can view active job postings"
  ON public.job_postings
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can manage their own job postings"
  ON public.job_postings
  FOR ALL
  USING (auth.uid() = user_id);

-- Add featured_until column to profiles for boosted visibility
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS featured_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS synergy_boost_score INTEGER DEFAULT 0;

-- Create index for better query performance on featured profiles
CREATE INDEX IF NOT EXISTS idx_profiles_featured ON public.profiles(is_featured, featured_until);
CREATE INDEX IF NOT EXISTS idx_job_postings_active ON public.job_postings(is_active, created_at);
CREATE INDEX IF NOT EXISTS idx_user_skill_tags_user ON public.user_skill_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skill_tags_skill ON public.user_skill_tags(skill);

-- Trigger for job_postings updated_at
CREATE TRIGGER update_job_postings_updated_at
  BEFORE UPDATE ON public.job_postings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();