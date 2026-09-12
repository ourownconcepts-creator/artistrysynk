import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { claimStoredReferral } from "@/lib/referral";
import { consumeAuthReturn, sanitizeAuthReturn } from "@/lib/authReturn";
import { pendingClaimPath } from "@/lib/integration/pendingClaim";
import { sendWelcomeAfterConfirm } from "@/lib/welcome-after-confirm.functions";

/**
 * Public OAuth landing route. Waits for the Supabase session to hydrate
 * (web redirect or native deep link) then sends the user onward.
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const sendWelcome = useServerFn(sendWelcomeAfterConfirm);

  useEffect(() => {
    let settled = false;
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const queryReturn = sanitizeAuthReturn(search.get("next"));

    const go = (path: string) => {
      if (settled) return;
      settled = true;
      navigate(path, { replace: true });
    };

    // A partner identity claim in progress always wins: the confirmation link
    // may arrive without the original claim parameters.
    const destination = () => pendingClaimPath() ?? consumeAuthReturn(queryReturn);
    const succeed = () => {
      // Confirmation succeeded: welcome email once, then finish the flow.
      // Never block navigation on the email.
      void sendWelcome({ data: undefined }).catch(() => {});
      void claimStoredReferral().finally(() => go(destination()));
    };


    // The link itself failed (expired or already used).
    const linkError = search.get("error_description") ?? hash.get("error_description");
    if (linkError) {
      go(`/auth?notice=${encodeURIComponent(linkError)}`);
      return;
    }

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) succeed();
    });

    // Finish whichever confirmation shape the link used, then fall through to
    // the session check.
    const finish = async () => {
      const tokenHash = search.get("token_hash");
      const type = search.get("type");
      const code = search.get("code");

      if (tokenHash && type) {
        await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as never });
      } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          go(
            "/auth?notice=" +
              encodeURIComponent(
                "Your email is confirmed. Please sign in to continue.",
              ),
          );
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) succeed();
    };

    void finish();

    const timeout = window.setTimeout(
      () =>
        go(
          "/auth?notice=" +
            encodeURIComponent("Please sign in to finish setting up your account."),
        ),
      8000,
    );

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