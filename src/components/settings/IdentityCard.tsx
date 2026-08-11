import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { BadgeCheck, Fingerprint, Loader2, Lock } from "lucide-react";
import type { DisplayNameMode } from "@/lib/identity";

const NAME_MODES: { value: DisplayNameMode; label: string }[] = [
  { value: "full_name", label: "My real name" },
  { value: "nickname", label: "My stage name / nickname" },
  { value: "username", label: "My @username only" },
  { value: "full_and_nickname", label: "Real name + stage name" },
  { value: "custom", label: "A custom display name" },
];

type IdentityState = {
  full_name: string;
  username: string;
  nickname: string;
  display_name: string;
  display_name_mode: DisplayNameMode;
  username_changed_at: string | null;
};

/**
 * Public identity (handle + display name) and the private legal identity
 * layer used for verification. Legal details are stored separately from the
 * public profile and are never returned to other members.
 */
export const IdentityCard = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<IdentityState>({
    full_name: "",
    username: "",
    nickname: "",
    display_name: "",
    display_name_mode: "full_name",
    username_changed_at: null,
  });
  const [legalName, setLegalName] = useState("");
  const [legalCountry, setLegalCountry] = useState("");
  const [verification, setVerification] = useState<{ status: string; level: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [{ data: profile }, { data: identity }] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, username, nickname, display_name, display_name_mode, username_changed_at")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("identity_profiles")
          .select("legal_name, legal_country, verification_status, verification_level")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (profile) {
        setState({
          full_name: profile.full_name ?? "",
          username: profile.username ?? "",
          nickname: profile.nickname ?? "",
          display_name: profile.display_name ?? "",
          display_name_mode: (profile.display_name_mode as DisplayNameMode) ?? "full_name",
          username_changed_at: profile.username_changed_at ?? null,
        });
      }
      if (identity) {
        setLegalName(identity.legal_name ?? "");
        setLegalCountry(identity.legal_country ?? "");
        setVerification({
          status: identity.verification_status,
          level: identity.verification_level,
        });
      }
      setLoading(false);
    };
    void load();
  }, []);

  const cooldownUntil = state.username_changed_at
    ? new Date(new Date(state.username_changed_at).getTime() + 30 * 24 * 60 * 60 * 1000)
    : null;
  const usernameLocked = !!cooldownUntil && cooldownUntil > new Date();

  const savePublic = async () => {
    if (!userId) return;
    setSaving(true);
    const payload: Record<string, unknown> = {
      nickname: state.nickname.trim() || null,
      display_name: state.display_name.trim() || null,
      display_name_mode: state.display_name_mode,
    };
    if (!usernameLocked) payload["username"] = state.username.trim().toLowerCase();

    const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Identity updated.");
  };

  const saveLegal = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from("identity_profiles").upsert(
      {
        user_id: userId,
        legal_name: legalName.trim() || null,
        legal_country: legalCountry.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    setSaving(false);
    if (error) toast.error("Could not save your legal details.");
    else toast.success("Legal identity saved privately.");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="h-5 w-5 text-primary" aria-hidden="true" />
          Identity
        </CardTitle>
        <CardDescription>
          Your handle and display name are public. Your legal details stay private and are only used
          for verification and compliance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="username">Username (handle)</Label>
          <Input
            id="username"
            value={state.username}
            disabled={usernameLocked}
            onChange={(e) => setState((p) => ({ ...p, username: e.target.value }))}
            maxLength={30}
          />
          <p className="text-xs text-muted-foreground">
            {usernameLocked
              ? `Locked until ${cooldownUntil?.toLocaleDateString()} — usernames can change once every 30 days.`
              : "Letters, numbers and underscores. Changing it starts a 30-day cooldown."}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="nickname">Stage name / nickname</Label>
          <Input
            id="nickname"
            value={state.nickname}
            onChange={(e) => setState((p) => ({ ...p, nickname: e.target.value }))}
            maxLength={60}
            placeholder="Optional"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="display_name_mode">How should your name appear?</Label>
          <Select
            value={state.display_name_mode}
            onValueChange={(v) =>
              setState((p) => ({ ...p, display_name_mode: v as DisplayNameMode }))
            }
          >
            <SelectTrigger id="display_name_mode" className="min-h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NAME_MODES.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {state.display_name_mode === "custom" ? (
          <div className="space-y-2">
            <Label htmlFor="display_name">Custom display name</Label>
            <Input
              id="display_name"
              value={state.display_name}
              onChange={(e) => setState((p) => ({ ...p, display_name: e.target.value }))}
              maxLength={60}
            />
          </div>
        ) : null}

        <Button onClick={() => void savePublic()} disabled={saving}>
          {saving ? "Saving…" : "Save identity"}
        </Button>

        <Separator />

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Lock className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="text-sm font-semibold">Private legal identity</p>
            {verification ? (
              <Badge variant={verification.status === "verified" ? "default" : "secondary"} className="gap-1">
                <BadgeCheck className="h-3 w-3" />
                {verification.status === "verified"
                  ? verification.level.replace(/_/g, " ")
                  : verification.status}
              </Badge>
            ) : (
              <Badge variant="secondary">Not started</Badge>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="legal_name">Legal name</Label>
              <Input
                id="legal_name"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                maxLength={120}
                placeholder="As it appears on your ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legal_country">Country</Label>
              <Input
                id="legal_country"
                value={legalCountry}
                onChange={(e) => setLegalCountry(e.target.value)}
                maxLength={60}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Never shown to other members. Only you and our compliance team can read it, and every
            staff access is logged.
          </p>
          <Button variant="outline" onClick={() => void saveLegal()} disabled={saving}>
            Save privately
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};