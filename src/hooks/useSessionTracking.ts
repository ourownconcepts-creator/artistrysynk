import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { trackSession } from "@/lib/session-tracking.functions";

export const useSessionTracking = () => {
  useEffect(() => {
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
    // Update last active every 5 minutes
    const interval = setInterval(run, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
};
