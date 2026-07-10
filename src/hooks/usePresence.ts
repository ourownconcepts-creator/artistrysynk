import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Updates the current user's `last_seen_at` every 60s while the tab is active.
 * Also updates on mount and on visibility change (tab focus).
 */
export const usePresence = (userId: string | null) => {
  useEffect(() => {
    if (!userId) return;

    const ping = async () => {
      if (document.visibilityState !== "visible") return;
      await supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", userId);
    };

    ping();
    const interval = setInterval(ping, 60_000);
    const onVis = () => ping();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [userId]);
};