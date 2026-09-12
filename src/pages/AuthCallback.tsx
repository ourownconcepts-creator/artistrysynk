import { useEffect } from "react";
import { useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { claimStoredReferral } from "@/lib/referral";
import { consumeAuthReturn, sanitizeAuthReturn } from "@/lib/authReturn";
import { pendingClaimPath } from "@/lib/integration/pendingClaim";

/**
 * Public OAuth landing route. Waits for the Supabase session to hydrate
 * (web redirect or native deep link) then sends the user onward.
 */
const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let settled = false;
    const queryReturn = sanitizeAuthReturn(new URLSearchParams(window.location.search).get("next"));

    const go = (path: string) => {
      if (settled) return;
      settled = true;
      navigate(path, { replace: true });
    };

    // A partner identity claim in progress always wins: the confirmation link
    // may arrive without the original claim parameters.
    const destination = () => pendingClaimPath() ?? consumeAuthReturn(queryReturn);

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) void claimStoredReferral().finally(() => go(destination()));
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void claimStoredReferral().finally(() => go(destination()));
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