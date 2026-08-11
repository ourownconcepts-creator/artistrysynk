import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AtSign, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";

type UsernameState = {
  username: string | null;
  display_name: string | null;
  full_name: string | null;
  nickname: string | null;
  next_change_at: string | null;
  can_change: boolean;
  history: { old: string | null; new: string | null; at: string }[];
};

const SITE = "artistrysynk.app";

/**
 * Username picker with debounced availability checks, a live profile-link
 * preview and the 30-day change cooldown surfaced up front. The database
 * guard trigger is the real boundary; this UI mirrors it.
 */
export const UsernamePicker = () => {
  const [state, setState] = useState<UsernameState | null>(null);
  const [value, setValue] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ available: boolean; reason: string | null; normalized: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("my_username_state");
    setState((data ?? null) as UsernameState | null);
    setValue(((data ?? {}) as UsernameState).username ?? "");
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const candidate = value.trim();
    if (!candidate || candidate === (state?.username ?? "")) {
      setResult(null);
      return;
    }
    setChecking(true);
    timer.current = setTimeout(async () => {
      const { data, error } = await supabase.rpc("check_username_available", { _username: candidate });
      setChecking(false);
      if (error) {
        setResult({ available: false, reason: "Could not check that name right now.", normalized: candidate });
        return;
      }
      setResult(data as unknown as { available: boolean; reason: string | null; normalized: string });
    }, 400);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, state?.username]);

  const save = async () => {
    setSaving(true);
    const { data, error } = await supabase.rpc("set_my_username", { _username: value.trim() });
    setSaving(false);
    const payload = (data ?? {}) as { ok?: boolean; reason?: string };
    if (error || !payload.ok) {
      toast.error(payload.reason ?? "Could not update your username.");
      return;
    }
    toast.success("Username updated.");
    void load();
  };

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
      </div>
    );
  }

  const preview = (result?.normalized || value.trim() || state?.username || "yourname").toLowerCase();
  const locked = state ? !state.can_change && !!state.username : false;
  const canSave =
    !!result?.available && !locked && !saving && value.trim() !== (state?.username ?? "");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AtSign className="h-5 w-5 text-primary" aria-hidden="true" />
          Your username
        </CardTitle>
        <CardDescription>
          This is your public handle and profile link. Your display name stays separate — change it
          on Edit profile.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {locked ? (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertTitle>Change on hold</AlertTitle>
            <AlertDescription>
              Usernames can change once every 30 days. You can pick a new one after{" "}
              {state?.next_change_at ? new Date(state.next_change_at).toLocaleDateString() : "the cooldown ends"}.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-2">
          <label htmlFor="username" className="text-sm font-medium">
            Username
          </label>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground" aria-hidden="true">
              @
            </span>
            <Input
              id="username"
              value={value}
              disabled={locked}
              maxLength={24}
              autoCapitalize="none"
              spellCheck={false}
              onChange={(e) => setValue(e.target.value.replace(/\s+/g, ""))}
              placeholder="yourname"
              aria-describedby="username-help"
            />
          </div>
          <p id="username-help" className="text-xs text-muted-foreground">
            3–24 characters. Letters, numbers and underscores only.
          </p>

          {checking ? (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Checking availability…
            </p>
          ) : result ? (
            <p
              role="status"
              className={`flex items-center gap-1 text-xs font-medium ${
                result.available ? "text-primary" : "text-destructive"
              }`}
            >
              {result.available ? (
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {result.available ? `@${result.normalized} is available` : result.reason}
            </p>
          ) : null}
        </div>

        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Live preview</p>
          <p className="mt-1 text-sm font-medium">
            {state?.display_name || state?.nickname || state?.full_name || "Your name"}{" "}
            <Badge variant="outline" className="ml-1 text-[10px]">
              @{preview}
            </Badge>
          </p>
          <p className="mt-1 break-all text-xs text-muted-foreground">
            {SITE}/profile/{preview}
          </p>
        </div>

        <Button onClick={() => void save()} disabled={!canSave} className="w-full">
          {saving ? "Saving…" : state?.username ? "Update username" : "Claim username"}
        </Button>

        {state?.history?.length ? (
          <div className="space-y-1">
            <p className="text-xs font-medium">Previous usernames</p>
            {state.history.slice(0, 5).map((h) => (
              <p key={`${h.old}-${h.at}`} className="text-xs text-muted-foreground">
                @{h.old} → @{h.new} · {new Date(h.at).toLocaleDateString()}
              </p>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};