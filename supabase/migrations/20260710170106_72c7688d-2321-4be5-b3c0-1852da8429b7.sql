
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at ON public.profiles(last_seen_at);

ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS match_online_notifications BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS match_activity_digest BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS last_digest_sent_at TIMESTAMPTZ;

-- Allow users to see last_seen_at of their matches via existing profiles policies (already permissive).
-- Function to fetch match activity digest data for a user
CREATE OR REPLACE FUNCTION public.get_match_activity_since(_user_id UUID, _since TIMESTAMPTZ)
RETURNS TABLE(
  match_user_id UUID,
  full_name TEXT,
  username TEXT,
  avatar_url TEXT,
  last_seen_at TIMESTAMPTZ,
  new_portfolio_items INT,
  new_messages INT,
  came_online BOOLEAN
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH my_matches AS (
    SELECT CASE WHEN user_id_1 = _user_id THEN user_id_2 ELSE user_id_1 END AS other_id
    FROM public.matches
    WHERE user_id_1 = _user_id OR user_id_2 = _user_id
  )
  SELECT
    p.id,
    p.full_name,
    p.username,
    p.avatar_url,
    p.last_seen_at,
    (SELECT COUNT(*)::INT FROM public.portfolio_items pi
       WHERE pi.user_id = p.id AND pi.created_at > _since),
    (SELECT COUNT(*)::INT FROM public.messages m
       JOIN public.conversations c ON c.id = m.conversation_id
       JOIN public.matches mt ON mt.id = c.match_id
       WHERE m.sender_id = p.id
         AND m.created_at > _since
         AND (mt.user_id_1 = _user_id OR mt.user_id_2 = _user_id)),
    (p.last_seen_at IS NOT NULL AND p.last_seen_at > _since)
  FROM public.profiles p
  JOIN my_matches mm ON mm.other_id = p.id;
$$;

GRANT EXECUTE ON FUNCTION public.get_match_activity_since(UUID, TIMESTAMPTZ) TO authenticated, service_role;
