import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@/lib/router-compat";

const CHECK_INTERVAL_MS = 60_000;

/**
 * Signs the user out automatically when the session expires or the
 * refresh/access token is no longer valid.
 */
export const SessionWatcher = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hadSession = useRef(false);
  const handling = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const forceSignOut = async (message: string) => {
      if (handling.current) return;
      handling.current = true;
      try {
        await queryClient.cancelQueries();
        queryClient.clear();
        await supabase.auth.signOut().catch(() => undefined);
        toast.error(message);
        navigate("/auth", { replace: true });
      } finally {
        hadSession.current = false;
        handling.current = false;
      }
    };

    const check = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) {
        if (hadSession.current) {
          await forceSignOut("Your session expired. Please sign in again.");
        }
        return;
      }

      hadSession.current = true;

      const expiresAt = session.expires_at ? session.expires_at * 1000 : null;
      if (expiresAt && expiresAt <= Date.now()) {
        const { error } = await supabase.auth.refreshSession();
        if (error && !cancelled) {
          await forceSignOut("Your session expired. Please sign in again.");
          return;
        }
      }

      const { error: userError } = await supabase.auth.getUser();
      if (userError && !cancelled) {
        await forceSignOut("Your login is no longer valid. Please sign in again.");
      }
    };

    void check();
    const interval = window.setInterval(() => void check(), CHECK_INTERVAL_MS);

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        hadSession.current = !!session;
        return;
      }
      if (event === "SIGNED_OUT" && hadSession.current) {
        hadSession.current = false;
        queryClient.clear();
      }
    });

    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      sub.subscription.unsubscribe();
    };
  }, [navigate, queryClient]);

  return null;
};
