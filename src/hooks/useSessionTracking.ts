import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { trackSession } from "@/lib/session-tracking.functions";

/** Records the signed-in session (with server-captured IP) app-wide. */
export const useSessionTracking = (userId?: string | null) => {
  useEffect(() => {
    if (userId === null) return;
    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      try {
        await trackSession({
          data: { sessionId: session.access_token.slice(-20), userAgent: navigator.userAgent },
        });
      } catch (e) {
        console.warn("session tracking failed", e);
      }
    };

    run();
    const interval = setInterval(run, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userId]);
};
