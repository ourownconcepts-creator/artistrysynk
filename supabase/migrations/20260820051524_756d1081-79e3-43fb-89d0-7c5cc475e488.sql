-- 1. Hide profiles.email from client roles (admins use get_profile_emails)
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (
  id, full_name, username, bio, location, avatar_url, cover_image_url, social_links,
  is_verified, created_at, updated_at, is_featured, featured_until, synergy_boost_score,
  is_hidden, looking_for, country, city, latitude, longitude, last_seen_at, nickname,
  display_name, display_name_mode, username_changed_at, professional_verified, professional_verified_at
) ON public.profiles TO anon, authenticated;

-- 2. creator_credits: scope to owner, project members/creators, or public projects
DROP POLICY IF EXISTS "Anyone can view credits" ON public.creator_credits;
CREATE POLICY "Credits visible for public projects or members"
  ON public.creator_credits FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = creator_credits.project_id
        AND p.is_public = true
        AND COALESCE(p.is_hidden, false) = false
    )
    OR public.is_project_member(auth.uid(), project_id)
    OR public.is_project_creator(auth.uid(), project_id)
  );

-- 3. user_skill_tags: follow profile visibility
DROP POLICY IF EXISTS "Users can view any skill tags" ON public.user_skill_tags;
CREATE POLICY "Skill tags follow profile visibility"
  ON public.user_skill_tags FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR (public.can_see_user(auth.uid(), user_id) AND public.profile_visible_to(auth.uid(), user_id))
  );

-- 4. beauty_profiles: follow profile visibility
DROP POLICY IF EXISTS "Beauty details are publicly viewable" ON public.beauty_profiles;
CREATE POLICY "Beauty details follow profile visibility"
  ON public.beauty_profiles FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR (public.can_see_user(auth.uid(), user_id) AND public.profile_visible_to(auth.uid(), user_id))
  );

-- 5. studio_feedback: only for portfolio items visible to the viewer
DROP POLICY IF EXISTS "Everyone can view feedback" ON public.studio_feedback;
CREATE POLICY "Feedback follows portfolio visibility"
  ON public.studio_feedback FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.portfolio_items pi
      WHERE pi.id = studio_feedback.portfolio_item_id
        AND COALESCE(pi.is_hidden, false) = false
        AND (
          pi.user_id = auth.uid()
          OR pi.studio_id IS NOT NULL
          OR (public.can_see_user(auth.uid(), pi.user_id) AND public.profile_visible_to(auth.uid(), pi.user_id))
        )
    )
  );

-- 6. Realtime broadcast topics: conversation typing requires participation
CREATE POLICY "participants_can_read_conversation_topic"
  ON realtime.messages FOR SELECT TO authenticated
  USING (
    realtime.topic() = ('user:' || auth.uid()::text)
    OR (
      realtime.topic() LIKE 'conversation-%'
      AND public.is_conversation_participant(
        auth.uid(),
        NULLIF(replace(realtime.topic(), 'conversation-', ''), '')::uuid
      )
    )
  );
CREATE POLICY "participants_can_write_conversation_topic"
  ON realtime.messages FOR INSERT TO authenticated
  WITH CHECK (
    realtime.topic() = ('user:' || auth.uid()::text)
    OR (
      realtime.topic() LIKE 'conversation-%'
      AND public.is_conversation_participant(
        auth.uid(),
        NULLIF(replace(realtime.topic(), 'conversation-', ''), '')::uuid
      )
    )
  );

-- 7. Internal SECURITY DEFINER helpers must not be callable by client roles
REVOKE EXECUTE ON FUNCTION public.audience_allows(text, uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_contact_user(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_discover(uuid, uuid, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_match_with(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_existing_relationship(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_discoverable(uuid, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_trusted_by(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_match_activity_since(uuid, timestamptz) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_identity_record(uuid, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_nearby_studios(double precision, double precision, double precision, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.meets_verification(uuid, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.requires_verification(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_verification_level(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.studio_role_of(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.studio_management_allowed(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.list_recommended_creatives(integer) FROM anon;
