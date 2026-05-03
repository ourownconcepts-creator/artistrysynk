
-- Ensure RLS is enabled on realtime.messages (broadcast/presence channel ACL).
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Drop any prior permissive policies we may have added.
DROP POLICY IF EXISTS "authenticated_can_read_own_topic" ON realtime.messages;
DROP POLICY IF EXISTS "authenticated_can_write_own_topic" ON realtime.messages;
DROP POLICY IF EXISTS "deny_anon_realtime" ON realtime.messages;

-- Authenticated users may only subscribe/publish to a topic
-- matching their own auth.uid() (e.g. "user:<uid>"). All other
-- broadcast/presence channels are denied. This app primarily uses
-- postgres_changes, which is filtered by source-table RLS and is
-- unaffected by these policies.
CREATE POLICY "authenticated_can_read_own_topic"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    realtime.topic() = ('user:' || auth.uid()::text)
  );

CREATE POLICY "authenticated_can_write_own_topic"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    realtime.topic() = ('user:' || auth.uid()::text)
  );
