import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { completeIdentityClaim } from "@/lib/integration/claim.functions";
import { useNavigate } from "@/lib/router-compat";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, Link2 } from "lucide-react";

export default function IntegrationClaim() {
  const navigate = useNavigate();
  const complete = useServerFn(completeIdentityClaim);
  const [status, setStatus] = useState<"loading" | "ready" | "done" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("Checking your invitation…");
  const params =
    typeof window === "undefined"
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);
  const remembered = typeof window === "undefined" ? null : peekPendingClaim();
  // Fall back to the remembered claim: the confirmation-email round trip can
  // drop the original query string.
  const code = params.get("code") ?? remembered?.code ?? "";
  const state = params.get("state") ?? remembered?.state;

  useEffect(() => {
    if (!code) {
      setStatus("error");
      setMessage("This invitation link is incomplete. Please start again from the partner site.");
      return;
    }
    // Persist before any sign-in detour so the flow can resume afterwards.
    rememberPendingClaim(code, state);
    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        const next = `/integration/v1/claim?code=${encodeURIComponent(code)}${
          state ? `&state=${encodeURIComponent(state)}` : ""
        }`;
        navigate(`/auth?next=${encodeURIComponent(next)}`, { replace: true });
        return;
      }
      setStatus("ready");
      setMessage("Your signed-in ArtistrySynk account is ready to be linked.");
    });
  }, [navigate, code, state]);

  const claim = async () => {
    setStatus("loading");
    setMessage("Completing your secure connection…");
    try {
      const result = await complete({ data: { code, state } });
      setStatus("done");
      setMessage("Your ArtistrySynk identity is now linked. Taking you back…");
      window.setTimeout(() => window.location.assign(result.redirectUri), 900);
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "This invitation could not be completed.",
      );
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-background p-4 text-foreground">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
            {status === "done" ? <CheckCircle2 /> : <Link2 />}
          </div>
          <CardTitle>Connect your ArtistrySynk identity</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        {status === "ready" && (
          <CardContent>
            <Button className="w-full" onClick={() => void claim()}>
              Connect identity
            </Button>
          </CardContent>
        )}
      </Card>
    </main>
  );
}
