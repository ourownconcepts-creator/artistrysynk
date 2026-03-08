-- Allow users to also see swipes where they are the swiped user (for "Who Liked You" feature)
DROP POLICY IF EXISTS "Users can view their own swipes" ON public.swipes;

CREATE POLICY "Users can view their own swipes"
ON public.swipes
FOR SELECT
TO authenticated
USING (auth.uid() = swiper_id OR auth.uid() = swiped_id);