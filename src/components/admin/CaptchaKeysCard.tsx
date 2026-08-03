import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, ShieldCheck, ShieldAlert, Save, Trash2 } from "lucide-react";

interface KeyStatus {
  siteKeyPreview: string | null;
  secretKeyPreview: string | null;
  siteKeyUpdatedAt: string | null;
  secretKeyUpdatedAt: string | null;
  envFallback: { siteKey: boolean; secretKey: boolean };
  active: boolean;
}

export const CaptchaKeysCard = () => {
  const [status, setStatus] = useState<KeyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [siteKey, setSiteKey] = useState("");
  const [secretKey, setSecretKey] = useState("");

  const call = async (payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("admin-captcha-keys", { body: payload });
    if (error) throw new Error(error.message);
    if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
    return data as KeyStatus;
  };

  const load = async () => {
    setLoading(true);
    try {
      setStatus(await call({ action: "status" }));
    } catch (e) {
      console.error(e);
      toast.error("Could not load CAPTCHA status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!siteKey.trim() && !secretKey.trim()) {
      toast.error("Enter a site key, a secret key, or both");
      return;
    }
    setSaving(true);
    try {
      const next = await call({ action: "save", siteKey, secretKey });
      setStatus(next);
      setSiteKey("");
      setSecretKey("");
      toast.success(next.active ? "CAPTCHA keys saved — protection is active" : "Keys saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save keys");
    } finally {
      setSaving(false);
    }
  };

  const clear = async () => {
    setClearing(true);
    try {
      setStatus(await call({ action: "clear" }));
      toast.success("Stored CAPTCHA keys removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not clear keys");
    } finally {
      setClearing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>CAPTCHA (hCaptcha) keys</CardTitle>
            <CardDescription>
              Stored encrypted-at-rest in the backend and only ever read by the contact form function — values are never
              sent back to the browser, only masked previews.
            </CardDescription>
          </div>
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin mt-1" aria-hidden="true" />
          ) : status?.active ? (
            <Badge className="gap-1"><ShieldCheck className="w-3 h-3" aria-hidden="true" />Active</Badge>
          ) : (
            <Badge variant="secondary" className="gap-1"><ShieldAlert className="w-3 h-3" aria-hidden="true" />Not configured</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="hcaptcha-site-key">Site key</Label>
            <Input
              id="hcaptcha-site-key"
              autoComplete="off"
              placeholder={status?.siteKeyPreview ?? "e.g. 10000000-ffff-ffff-ffff-000000000001"}
              value={siteKey}
              onChange={(e) => setSiteKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {status?.siteKeyPreview
                ? `Saved: ${status.siteKeyPreview}`
                : status?.envFallback.siteKey
                  ? "Using project secret fallback"
                  : "Not set"}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="hcaptcha-secret-key">Secret key</Label>
            <Input
              id="hcaptcha-secret-key"
              type="password"
              autoComplete="new-password"
              placeholder={status?.secretKeyPreview ?? "0x..."}
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {status?.secretKeyPreview
                ? `Saved: ${status.secretKeyPreview}`
                : status?.envFallback.secretKey
                  ? "Using project secret fallback"
                  : "Not set"}
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Get both keys free at hcaptcha.com. Until both are present, the contact form still enforces rate limits,
          honeypot, timing and spam heuristics — the challenge simply stays off. Once saved, adaptive verification turns
          on immediately, no redeploy needed.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button onClick={save} disabled={saving}>
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />Saving…</>
            ) : (
              <><Save className="w-4 h-4 mr-2" aria-hidden="true" />Save keys</>
            )}
          </Button>
          <Button variant="outline" onClick={clear} disabled={clearing || (!status?.siteKeyPreview && !status?.secretKeyPreview)}>
            {clearing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />Removing…</>
            ) : (
              <><Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />Remove stored keys</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
