-- 1. FOREIGN-KEY INDEXES (high-growth relationships)
CREATE INDEX IF NOT EXISTS idx_portfolio_items_user_id ON public.portfolio_items (user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON public.project_members (user_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON public.project_tasks (project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_assigned_to ON public.project_tasks (assigned_to);
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON public.project_files (project_id);
CREATE INDEX IF NOT EXISTS idx_project_activity_logs_project_id ON public.project_activity_logs (project_id);
CREATE INDEX IF NOT EXISTS idx_project_role_changes_project_id ON public.project_role_changes (project_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects (created_by);
CREATE INDEX IF NOT EXISTS idx_external_file_links_project_id ON public.external_file_links (project_id);
CREATE INDEX IF NOT EXISTS idx_creator_credits_project_id ON public.creator_credits (project_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_posts_user_id ON public.collaboration_posts (user_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_post_comments_post_id ON public.collaboration_post_comments (post_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_requests_match_id ON public.collaboration_requests (match_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_service_id ON public.service_orders (service_id);
CREATE INDEX IF NOT EXISTS idx_service_reviews_service_id ON public.service_reviews (service_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_user_id ON public.job_postings (user_id);
CREATE INDEX IF NOT EXISTS idx_featured_creatives_user_id ON public.featured_creatives (user_id);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_user_id ON public.revenue_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_flag_id ON public.moderation_actions (flag_id);
CREATE INDEX IF NOT EXISTS idx_studio_feedback_portfolio_item_id ON public.studio_feedback (portfolio_item_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_document_version_id ON public.user_consents (document_version_id);
CREATE INDEX IF NOT EXISTS idx_contact_submission_audit_submission_id ON public.contact_submission_audit (submission_id);

-- 2. CHAT IMAGES BUCKET POLICIES (path: {ownerId}/{conversationId}/{uuid}.ext)
CREATE POLICY "Users upload own chat images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Conversation participants read chat images"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-images' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.media_url = objects.name
        AND public.is_conversation_participant(auth.uid(), m.conversation_id)
    )
  )
);

CREATE POLICY "Users delete own chat images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'chat-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 3. PROJECT FILES BUCKET POLICIES (path: {projectId}/...)
CREATE POLICY "Project members upload project files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'project-files'
  AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  AND (
    public.is_project_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
    OR public.is_project_creator(auth.uid(), ((storage.foldername(name))[1])::uuid)
  )
);

CREATE POLICY "Project members read project files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'project-files'
  AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  AND (
    public.is_project_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
    OR public.is_project_creator(auth.uid(), ((storage.foldername(name))[1])::uuid)
  )
);

CREATE POLICY "Project members update project files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'project-files'
  AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  AND (
    public.is_project_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
    OR public.is_project_creator(auth.uid(), ((storage.foldername(name))[1])::uuid)
  )
);

CREATE POLICY "Owners and project creators delete project files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'project-files'
  AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  AND (
    owner = auth.uid()
    OR public.is_project_creator(auth.uid(), ((storage.foldername(name))[1])::uuid)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'master_admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
);

-- 4. Narrow the public copyright-evidence upload surface to the intake prefix only
DROP POLICY IF EXISTS "Anyone can upload copyright evidence" ON storage.objects;
CREATE POLICY "Public intake can upload copyright evidence"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'copyright-evidence' AND name LIKE 'intake/%');

-- 5. Non-destructive size guard on project file metadata (200MB canonical cap)
ALTER TABLE public.project_files
  ADD CONSTRAINT project_files_file_size_limit
  CHECK (file_size IS NULL OR file_size <= 209715200) NOT VALID;