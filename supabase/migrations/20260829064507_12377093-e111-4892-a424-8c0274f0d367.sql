DROP POLICY IF EXISTS "Feedback follows portfolio visibility" ON public.studio_feedback;

CREATE POLICY "Feedback follows portfolio visibility"
ON public.studio_feedback
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.portfolio_items pi
    WHERE pi.id = studio_feedback.portfolio_item_id
      AND COALESCE(pi.is_hidden, false) = false
      AND (
        pi.user_id = auth.uid()
        OR (
          pi.studio_id IS NOT NULL
          AND (
            public.is_studio_member(auth.uid(), pi.studio_id)
            OR EXISTS (
              SELECT 1 FROM public.studios s
              WHERE s.id = pi.studio_id
                AND s.visibility = 'public'
                AND s.is_active = true
                AND s.is_hidden = false
            )
          )
        )
        OR (
          pi.studio_id IS NULL
          AND public.can_see_user(auth.uid(), pi.user_id)
          AND public.profile_visible_to(auth.uid(), pi.user_id)
        )
      )
  )
);