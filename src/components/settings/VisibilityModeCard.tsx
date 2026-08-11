import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Pressable } from "@/components/native-ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { EyeOff, Globe, Loader2, Radar, Users } from "lucide-react";
import {
  AUDIENCE_OPTIONS,
  OPPORTUNITY_TYPES,
  VISIBILITY_COLUMNS,
  VISIBILITY_DEFAULTS,
  VISIBILITY_MODES,
  saveVisibilityControl,
  type VisibilityControls,
  type VisibilityMode,
} from "@/lib/identity";

const MODE_ICONS: Record<VisibilityMode, typeof Globe> = {
  public: Globe,
  discoverable: Radar,
  private: Users,
  invisible: EyeOff,
};

const PERMISSIONS: { key: keyof VisibilityControls; label: string; help: string }[] = [
  { key: "who_can_discover", label: "Who can discover me", help: "Search, browsing and the Discover deck." },
  { key: "who_can_match", label: "Who can swipe on me", help: "Controls who may like or match with you." },
  { key: "who_can_contact", label: "Who can contact me", help: "Applies to new conversations and requests." },
  { key: "who_can_scout", label: "Who can scout me", help: "Studios, labels and scouts using talent search." },
  { key: "who_can_introduce", label: "Who can introduce me", help: "Who may pass your profile to someone else." },
];

/**
 * Visibility mode + granular discovery permissions. Every value here is
 * enforced server-side by can_discover / can_match_with / can_contact_user,
 * so switching a mode off actually removes you from those surfaces.
 */
export const VisibilityModeCard = () => {
  const [controls, setControls] = useState<VisibilityControls>(VISIBILITY_DEFAULTS);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase
        .from("user_settings")
        .select(VISIBILITY_COLUMNS)
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setControls({ ...VISIBILITY_DEFAULTS, ...(data as Partial<VisibilityControls>) });
      setLoading(false);
    };
    void load();
  }, []);

  const persist = async <K extends keyof VisibilityControls>(key: K, value: VisibilityControls[K]) => {
    if (!userId) return;
    const previous = controls[key];
    setControls((prev) => ({ ...prev, [key]: value }));
    setSavingKey(key as string);
    const error = await saveVisibilityControl(userId, key, value);
    setSavingKey(null);
    if (error) {
      setControls((prev) => ({ ...prev, [key]: previous }));
      toast.error("Could not save that setting.");
    } else {
      toast.success("Visibility updated.");
    }
  };

  const toggleOpportunity = (value: string) => {
    const next = controls.opportunity_types.includes(value)
      ? controls.opportunity_types.filter((v) => v !== value)
      : [...controls.opportunity_types, value];
    void persist("opportunity_types", next);
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
          <Radar className="h-5 w-5 text-primary" aria-hidden="true" />
          Visibility mode
        </CardTitle>
        <CardDescription>
          Pick how visible you are, then fine-tune exactly who may find, match, contact or scout you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-2 sm:grid-cols-2">
          {VISIBILITY_MODES.map((m) => {
            const Icon = MODE_ICONS[m.value];
            const active = controls.visibility_mode === m.value;
            return (
              <Pressable
                key={m.value}
                onClick={() => void persist("visibility_mode", m.value)}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  active ? "border-primary bg-primary/10" : "border-border"
                }`}
                aria-pressed={active}
              >
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                  {m.label}
                  {active ? <Badge variant="secondary" className="ml-auto text-[10px]">Active</Badge> : null}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{m.help}</p>
              </Pressable>
            );
          })}
        </div>

        <Separator />

        <div className="space-y-4">
          {PERMISSIONS.map((p) => (
            <div key={p.key} className="space-y-2">
              <Label htmlFor={p.key}>{p.label}</Label>
              <Select
                value={controls[p.key] as string}
                disabled={savingKey === p.key}
                onValueChange={(v) => void persist(p.key, v as never)}
              >
                <SelectTrigger id={p.key} className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUDIENCE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{p.help}</p>
            </div>
          ))}
        </div>

        <Separator />

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-0.5">
            <Label htmlFor="allow_search_indexing">Allow search engines</Label>
            <p className="text-sm text-muted-foreground">
              Let Google and other engines index your public profile page.
            </p>
          </div>
          <Switch
            id="allow_search_indexing"
            checked={controls.allow_search_indexing}
            disabled={savingKey === "allow_search_indexing" || controls.visibility_mode !== "public"}
            onCheckedChange={(v) => void persist("allow_search_indexing", v)}
          />
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-0.5">
              <Label htmlFor="open_to_opportunities">Open to opportunities</Label>
              <p className="text-sm text-muted-foreground">
                Appear in talent search for scouts, studios and labels.
              </p>
            </div>
            <Switch
              id="open_to_opportunities"
              checked={controls.open_to_opportunities}
              disabled={savingKey === "open_to_opportunities"}
              onCheckedChange={(v) => void persist("open_to_opportunities", v)}
            />
          </div>

          {controls.open_to_opportunities ? (
            <>
              <div className="flex flex-wrap gap-2">
                {OPPORTUNITY_TYPES.map((o) => {
                  const active = controls.opportunity_types.includes(o.value);
                  return (
                    <Pressable
                      key={o.value}
                      onClick={() => toggleOpportunity(o.value)}
                      className={`rounded-full border px-3 py-1.5 text-xs ${
                        active ? "border-primary bg-primary/10 text-primary" : "border-border"
                      }`}
                      aria-pressed={active}
                    >
                      {o.label}
                    </Pressable>
                  );
                })}
              </div>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-0.5">
                  <Label htmlFor="anonymous_talent_profile">Stay anonymous to scouts</Label>
                  <p className="text-sm text-muted-foreground">
                    Scouts see your roles, skills and city under a reference code only — no name,
                    photo or link until you accept an introduction.
                  </p>
                </div>
                <Switch
                  id="anonymous_talent_profile"
                  checked={controls.anonymous_talent_profile}
                  disabled={savingKey === "anonymous_talent_profile"}
                  onCheckedChange={(v) => void persist("anonymous_talent_profile", v)}
                />
              </div>
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};