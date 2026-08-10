-- Helper: conversation participation
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_user_id uuid, _conversation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.matches m ON m.id = c.match_id
    WHERE c.id = _conversation_id
      AND (m.user_id_1 = _user_id OR m.user_id_2 = _user_id)
  )
$$;

-- Voice note / attachment support on messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS media_type text,
  ADD COLUMN IF NOT EXISTS media_duration_seconds integer;

-- Message reactions
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);
GRANT SELECT, INSERT, DELETE ON public.message_reactions TO authenticated;
GRANT ALL ON public.message_reactions TO service_role;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view reactions" ON public.message_reactions
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_reactions.message_id
      AND public.is_conversation_participant(auth.uid(), m.conversation_id)
  )
);
CREATE POLICY "Participants can add own reactions" ON public.message_reactions
FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_reactions.message_id
      AND public.is_conversation_participant(auth.uid(), m.conversation_id)
  )
);
CREATE POLICY "Users can remove own reactions" ON public.message_reactions
FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Meetings
CREATE TABLE IF NOT EXISTS public.project_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  title text NOT NULL,
  agenda text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  location text,
  meeting_url text,
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_meetings TO authenticated;
GRANT ALL ON public.project_meetings TO service_role;
ALTER TABLE public.project_meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view meetings" ON public.project_meetings
FOR SELECT TO authenticated USING (
  public.is_project_member(auth.uid(), project_id) OR public.is_project_creator(auth.uid(), project_id)
);
CREATE POLICY "Members can create meetings" ON public.project_meetings
FOR INSERT TO authenticated WITH CHECK (
  created_by = auth.uid() AND (
    public.is_project_member(auth.uid(), project_id) OR public.is_project_creator(auth.uid(), project_id)
  )
);
CREATE POLICY "Organiser or owner can update meetings" ON public.project_meetings
FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.is_project_creator(auth.uid(), project_id))
WITH CHECK (created_by = auth.uid() OR public.is_project_creator(auth.uid(), project_id));
CREATE POLICY "Organiser or owner can delete meetings" ON public.project_meetings
FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.is_project_creator(auth.uid(), project_id));

-- Notes
CREATE TABLE IF NOT EXISTS public.project_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_notes TO authenticated;
GRANT ALL ON public.project_notes TO service_role;
ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view notes" ON public.project_notes
FOR SELECT TO authenticated USING (
  public.is_project_member(auth.uid(), project_id) OR public.is_project_creator(auth.uid(), project_id)
);
CREATE POLICY "Members can create notes" ON public.project_notes
FOR INSERT TO authenticated WITH CHECK (
  created_by = auth.uid() AND (
    public.is_project_member(auth.uid(), project_id) OR public.is_project_creator(auth.uid(), project_id)
  )
);
CREATE POLICY "Author or owner can update notes" ON public.project_notes
FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.is_project_creator(auth.uid(), project_id))
WITH CHECK (created_by = auth.uid() OR public.is_project_creator(auth.uid(), project_id));
CREATE POLICY "Author or owner can delete notes" ON public.project_notes
FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.is_project_creator(auth.uid(), project_id));

-- Deliverables
CREATE TABLE IF NOT EXISTS public.project_deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  assigned_to uuid,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  due_date date,
  review_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_deliverables TO authenticated;
GRANT ALL ON public.project_deliverables TO service_role;
ALTER TABLE public.project_deliverables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view deliverables" ON public.project_deliverables
FOR SELECT TO authenticated USING (
  public.is_project_member(auth.uid(), project_id) OR public.is_project_creator(auth.uid(), project_id)
);
CREATE POLICY "Members can create deliverables" ON public.project_deliverables
FOR INSERT TO authenticated WITH CHECK (
  created_by = auth.uid() AND (
    public.is_project_member(auth.uid(), project_id) OR public.is_project_creator(auth.uid(), project_id)
  )
);
CREATE POLICY "Members can update deliverables" ON public.project_deliverables
FOR UPDATE TO authenticated USING (
  public.is_project_member(auth.uid(), project_id) OR public.is_project_creator(auth.uid(), project_id)
) WITH CHECK (
  public.is_project_member(auth.uid(), project_id) OR public.is_project_creator(auth.uid(), project_id)
);
CREATE POLICY "Author or owner can delete deliverables" ON public.project_deliverables
FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.is_project_creator(auth.uid(), project_id));

-- updated_at triggers
CREATE TRIGGER trg_project_meetings_updated_at BEFORE UPDATE ON public.project_meetings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_project_notes_updated_at BEFORE UPDATE ON public.project_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_project_deliverables_updated_at BEFORE UPDATE ON public.project_deliverables
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER TABLE public.message_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.project_meetings REPLICA IDENTITY FULL;
ALTER TABLE public.project_notes REPLICA IDENTITY FULL;
ALTER TABLE public.project_deliverables REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_meetings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_deliverables;

CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_project_meetings_project ON public.project_meetings(project_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_project_notes_project ON public.project_notes(project_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_deliverables_project ON public.project_deliverables(project_id, due_date);