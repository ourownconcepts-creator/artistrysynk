import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Check, ShieldCheck, UserRound } from "lucide-react";

type OAuthResult = { redirect_url?: string; redirect_to?: string };
type AuthorizationDetails = OAuthResult & {
  client?: { name?: string; client_name?: string };
  client_name?: string;
  redirect_uri?: string;
  scopes?: string[] | string;
  scope?: string;
};
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: Error | null }>;
  approveAuthorization: (id: string) => Promise<{ data: OAuthResult | null; error: Error | null }>;
  denyAuthorization: (id: string) => Promise<{ data: OAuthResult | null; error: Error | null }>;
};

const labels: Record<string, string> = {
  openid: "Confirm your ArtistrySynk identity",
  email: "Share your email address",
  profile: "Share your basic profile",
  "identity:create": "Start an ArtistrySynk identity invitation",
  "identity:read": "Read your linked identity status",
  "identity:link": "Link your ArtistrySynk identity",
  "profile:read": "Read approved profile fields",
};

function redirectFrom(result: OAuthResult | null) {
  return result?.redirect_url ?? result?.redirect_to;
}

export default function OAuthConsent() {
  const navigate = useNavigate();
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [account, setAccount] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const authorizationId = typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("authorization_id") ?? "";

  const oauth = supabase.auth.oauth as OAuthApi;
  const finishRedirect = useCallback((result: OAuthResult | null) => {
    const target = redirectFrom(result);
    if (!target) throw new Error("The authorization provider did not return a redirect.");
    window.location.assign(target);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!authorizationId) { setError("This connection request is missing or invalid."); return; }
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        const next = `${window.location.pathname}${window.location.search}`;
        navigate(`/auth?next=${encodeURIComponent(next)}`, { replace: true });
        return;
      }
      setAccount(sessionData.session.user.email ?? "Signed-in account");
      const result = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (result.error) { setError("This connection request has expired or is invalid."); return; }
      const immediate = redirectFrom(result.data);
      if (immediate && !result.data?.client && !result.data?.client_name) { window.location.assign(immediate); return; }
      setDetails(result.data);
    })();
    return () => { active = false; };
  }, [authorizationId, navigate, oauth]);

  const decide = async (approved: boolean) => {
    if (!oauth || !authorizationId) return;
    setBusy(true); setError("");
    const result = approved
      ? await oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true })
      : await oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true });
    if (result.error) { setError(approved ? "The connection could not be approved." : "The connection could not be cancelled."); setBusy(false); return; }
    finishRedirect(result.data);
  };

  const clientName = details?.client?.name ?? details?.client?.client_name ?? details?.client_name ?? "this application";
  const rawScopes = details?.scopes ?? details?.scope ?? "openid email profile";
  const scopes = Array.isArray(rawScopes) ? rawScopes : rawScopes.split(/\s+/).filter(Boolean);

  return <main className="min-h-screen bg-background px-4 py-12 text-foreground">
    <Card className="mx-auto max-w-lg border-border bg-card shadow-xl">
      <CardHeader className="space-y-4 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10 text-primary"><ShieldCheck /></div>
        <CardTitle>{details ? `Connect ${clientName} to ArtistrySynk` : error ? "Connection unavailable" : "Checking connection"}</CardTitle>
        <CardDescription>{details ? `${clientName} will be able to use ArtistrySynk as you.` : error || "Please wait…"}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {details && <>
          <div className="flex items-center gap-3 border-y border-border py-4"><UserRound className="size-5 text-muted-foreground" /><div><p className="text-sm font-medium">Signed in as</p><p className="text-sm text-muted-foreground">{account}</p></div></div>
          <div className="space-y-3">{scopes.map((scope) => <div key={scope} className="flex gap-3 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-primary" /><span>{labels[scope] ?? `Additional permission requested: ${scope}`}</span></div>)}</div>
          <p className="text-xs text-muted-foreground">This does not bypass ArtistrySynk permissions or privacy controls.</p>
        </>}
        {error && <div className="flex gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="size-4 shrink-0" />{error}</div>}
      </CardContent>
      {details && <CardFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" disabled={busy} onClick={() => void decide(false)}>Cancel connection</Button>
        <Button disabled={busy} onClick={() => void decide(true)}>Approve connection</Button>
      </CardFooter>}
    </Card>
  </main>;
}