import { useEffect } from "react";
import { useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { claimStoredReferral } from "@/lib/referral";

/**
 * Public OAuth landing route. Waits for the Supabase session to hydrate
 * (web redirect or native deep link) then sends the user onward.
 */
const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let settled = false;

    const go = (path: string) => {
      if (settled) return;
      settled = true;
      navigate(path, { replace: true });
    };

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) void claimStoredReferral().finally(() => go("/discover"));
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void claimStoredReferral().finally(() => go("/discover"));
    });

    const timeout = window.setTimeout(() => go("/auth"), 8000);

    return () => {
      subscription.subscription.unsubscribe();
      window.clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <LoadingSpinner />
      <p className="text-sm text-muted-foreground">Signing you in…</p>
    </div>
  );
};

export default AuthCallback;