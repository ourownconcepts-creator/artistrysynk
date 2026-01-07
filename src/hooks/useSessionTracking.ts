import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useSessionTracking = () => {
  useEffect(() => {
    const trackSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const sessionId = session.access_token.slice(-20);
      
      // Check if session already exists
      const { data: existingSession } = await supabase
        .from('user_sessions')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('session_id', sessionId)
        .single();

      if (existingSession) {
        // Update last active
        await supabase
          .from('user_sessions')
          .update({ last_active: new Date().toISOString() })
          .eq('id', existingSession.id);
      } else {
        // Create new session
        await supabase.from('user_sessions').insert({
          user_id: session.user.id,
          session_id: sessionId,
          user_agent: navigator.userAgent,
          is_active: true,
        });
      }
    };

    trackSession();

    // Update last active every 5 minutes
    const interval = setInterval(trackSession, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);
};
