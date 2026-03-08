-- Emoji reactions table
CREATE TABLE public.collaboration_post_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.collaboration_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id, reaction_type)
);

ALTER TABLE public.collaboration_post_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reactions"
  ON public.collaboration_post_reactions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Users can add reactions"
  ON public.collaboration_post_reactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their reactions"
  ON public.collaboration_post_reactions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Star ratings table for posts
CREATE TABLE public.collaboration_post_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.collaboration_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.collaboration_post_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ratings"
  ON public.collaboration_post_ratings FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Users can add ratings"
  ON public.collaboration_post_ratings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their ratings"
  ON public.collaboration_post_ratings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their ratings"
  ON public.collaboration_post_ratings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);