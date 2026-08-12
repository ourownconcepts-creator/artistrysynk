ALTER TABLE public.blocked_users REPLICA IDENTITY FULL;
ALTER TABLE public.muted_users REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'blocked_users'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.blocked_users;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'muted_users'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.muted_users;
  END IF;
END $$;