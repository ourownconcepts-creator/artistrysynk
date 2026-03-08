
-- Add new roles to creative_role enum
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'artist';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'audio_engineer';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'software_developer';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'frontend_developer';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'backend_developer';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'full_stack_developer';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'mobile_app_developer';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'ai_engineer';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'blockchain_developer';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'ui_designer';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'ux_designer';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'product_designer';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS '3d_designer';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'product_manager';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'startup_founder';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'technical_cofounder';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'growth_marketer';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'seo_specialist';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'digital_marketer';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'data_scientist';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'devops_engineer';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'game_developer';
ALTER TYPE public.creative_role ADD VALUE IF NOT EXISTS 'content_creator';

-- Add looking_for and country/city to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS looking_for text[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city text;

-- Add project_category and compensation_type to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS project_category text DEFAULT 'other';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS compensation_type text DEFAULT 'open_collaboration';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS is_open boolean DEFAULT false;

-- Collaboration Feed Posts
CREATE TABLE IF NOT EXISTS public.collaboration_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  hashtags text[] DEFAULT '{}',
  role_tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.collaboration_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view collaboration posts" ON public.collaboration_posts
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own posts" ON public.collaboration_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" ON public.collaboration_posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" ON public.collaboration_posts
  FOR DELETE USING (auth.uid() = user_id);

-- Collaboration Post Likes
CREATE TABLE IF NOT EXISTS public.collaboration_post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.collaboration_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.collaboration_post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes" ON public.collaboration_post_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can like posts" ON public.collaboration_post_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts" ON public.collaboration_post_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Collaboration Post Comments
CREATE TABLE IF NOT EXISTS public.collaboration_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.collaboration_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.collaboration_post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments" ON public.collaboration_post_comments
  FOR SELECT USING (true);

CREATE POLICY "Users can create comments" ON public.collaboration_post_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON public.collaboration_post_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Collaboration Post Saves/Bookmarks
CREATE TABLE IF NOT EXISTS public.collaboration_post_saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.collaboration_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.collaboration_post_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saves" ON public.collaboration_post_saves
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save posts" ON public.collaboration_post_saves
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave posts" ON public.collaboration_post_saves
  FOR DELETE USING (auth.uid() = user_id);

-- Creator Credits
CREATE TABLE IF NOT EXISTS public.creator_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role_title text NOT NULL,
  is_verified boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.creator_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view credits" ON public.creator_credits
  FOR SELECT USING (true);

CREATE POLICY "Project creators can manage credits" ON public.creator_credits
  FOR ALL USING (public.is_project_creator(auth.uid(), project_id));

CREATE POLICY "Users can view own credits" ON public.creator_credits
  FOR SELECT USING (auth.uid() = user_id);

-- Enable realtime for collaboration posts
ALTER PUBLICATION supabase_realtime ADD TABLE public.collaboration_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.collaboration_post_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.collaboration_post_comments;
