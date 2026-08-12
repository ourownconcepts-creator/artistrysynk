import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Keeps chats consistent across a user's devices: blocking or muting on one
 * device replicates through Realtime, so the other device refreshes instead of
 * showing a conversation that is no longer allowed.
 */
export const useSafetyListSync = (userId: string | null, onChange: () => void) => {
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`safety-sync-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blocked_users", filter: `blocker_id=eq.${userId}` },
        () => onChange(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "muted_users", filter: `muter_id=eq.${userId}` },
        () => onChange(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
};
