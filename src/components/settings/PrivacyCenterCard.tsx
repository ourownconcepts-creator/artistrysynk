import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Eye, Loader2, MapPin, Sparkles } from "lucide-react";

type Controls = {
  discoverable_in_discovery: boolean;
  discoverable_in_search: boolean;
  discoverable_in_recommendations: boolean;
  location_precision: string;
  personalisation_enabled: boolean;
  ai_features_enabled: boolean;
};

const defaults: Controls = {
  discoverable_in_discovery: true,
  discoverable_in_search: true,
  discoverable_in_recommendations: true,
  location_precision: "city",
  personalisation_enabled: true,
  ai_features_enabled: true,
};

const toggles: { key: keyof Controls; label: string; help: string }[] = [
  {
    key: "discoverable_in_discovery",
    label: "Appear in swipe discovery",
    help: "Other creatives can find you in the Discover deck.",
  },
  {
    key: "discoverable_in_search",
    label: "Appear in search and browsing",
    help: "Your profile shows up in search, the gallery and public listings.",
  },
  {
    key: "discoverable_in_recommendations",
    label: "Appear in recommendations",
    help: "You can be suggested as a collaborator on other people's screens.",
  },
  {
    key: "personalisation_enabled",
    label: "Personalised suggestions",
    help: "Use your roles, genres and activity to tailor what you see.",
  },
  {
    key: "ai_features_enabled",
    label: "AI-assisted features",
    help: "Allow synergy scoring and Synk AI to process your profile content.",
  },
];

/**
 * Personal data controls. Each choice is enforced server-side in the
 * discovery, search and location queries — not just hidden in the UI.
 */
export const PrivacyCenterCard = () => {
  const [controls, setControls] = useState<Controls>(defaults);
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
        .select(
          "discoverable_in_discovery, discoverable_in_search, discoverable_in_recommendations, location_precision, personalisation_enabled, ai_features_enabled",
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) setControls({ ...defaults, ...(data as Partial<Controls>) });
      setLoading(false);
    };
    void load();
  }, []);

  const persist = async <K extends keyof Controls>(key: K, value: Controls[K]) => {
    if (!userId) return;
    const previous = controls[key];
    setControls((prev) => ({ ...prev, [key]: value }));
    setSavingKey(key);

    const { error } = await supabase
      .from("user_settings")
      .upsert(
        { user_id: userId, [key]: value, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );

    setSavingKey(null);
    if (error) {
      setControls((prev) => ({ ...prev, [key]: previous }));
      toast.error("Could not save that preference.");
    } else {
      toast.success("Privacy preference saved.");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" aria-hidden="true" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary" aria-hidden="true" />
          Personal data controls
        </CardTitle>
        <CardDescription>
          Decide where you appear and how your data is used. Changes apply immediately across
          discovery, search and recommendations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {toggles.map((t, index) => (
          <div key={t.key}>
            {index === 3 && <Separator className="mb-5" />}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5 min-w-0">
                <Label htmlFor={t.key} className="flex items-center gap-2">
                  {index >= 3 && <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />}
                  {t.label}
                </Label>
                <p className="text-sm text-muted-foreground">{t.help}</p>
              </div>
              <Switch
                id={t.key}
                checked={controls[t.key] as boolean}
                disabled={savingKey === t.key}
                onCheckedChange={(v) => void persist(t.key, v as Controls[typeof t.key])}
                aria-label={t.label}
              />
            </div>
          </div>
        ))}

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="location-precision" className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" aria-hidden="true" />
            Location sharing
          </Label>
          <Select
            value={controls.location_precision}
            onValueChange={(v) => void persist("location_precision", v)}
          >
            <SelectTrigger id="location-precision" className="min-h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="off">Off — never use my location</SelectItem>
              <SelectItem value="city">City only — hide my exact coordinates</SelectItem>
              <SelectItem value="precise">Precise — allow accurate distance matching</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            With “City only” your coordinates are never returned to other users; “Off” removes you
            from nearby search entirely.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
