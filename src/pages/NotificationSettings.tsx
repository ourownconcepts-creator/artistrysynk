import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Bell,
  Heart,
  Sparkles,
  MessageCircle,
  Users,
  FolderKanban,
  Mail,
  Loader2,
  ArrowLeft,
} from "lucide-react";

type PrefKey =
  | "notify_email_likes" | "notify_inapp_likes"
  | "notify_email_discovery" | "notify_inapp_discovery"
  | "notify_email_matches" | "notify_inapp_matches"
  | "notify_email_messages" | "notify_inapp_messages"
  | "notify_email_online" | "notify_inapp_online"
  | "notify_email_projects" | "notify_inapp_projects";

type Prefs = Record<PrefKey, boolean> & {
  email_notifications: boolean;
  push_notifications: boolean;
};

const defaults: Prefs = {
  email_notifications: true,
  push_notifications: true,
  notify_email_likes: true,
  notify_inapp_likes: true,
  notify_email_discovery: true,
  notify_inapp_discovery: true,
  notify_email_matches: true,
  notify_inapp_matches: true,
  notify_email_messages: true,
  notify_inapp_messages: true,
  notify_email_online: true,
  notify_inapp_online: true,
  notify_email_projects: true,
  notify_inapp_projects: true,
};

const TYPES: Array<{
  id: string;
  label: string;
  description: string;
  icon: typeof Heart;
  email: PrefKey;
  inApp: PrefKey;
}> = [
  {
    id: "likes",
    label: "Likes",
    description: "When another creative likes your profile.",
    icon: Heart,
    email: "notify_email_likes",
    inApp: "notify_inapp_likes",
  },
  {
    id: "discovery",
    label: "Profile discovery",
    description: "When your profile shows up in someone's discovery deck.",
    icon: Sparkles,
    email: "notify_email_discovery",
    inApp: "notify_inapp_discovery",
  },
  {
    id: "matches",
    label: "Matches",
    description: "When a like is mutual and a new match is created.",
    icon: Users,
    email: "notify_email_matches",
    inApp: "notify_inapp_matches",
  },
  {
    id: "messages",
    label: "Messages",
    description: "When a match sends you a new message.",
    icon: MessageCircle,
    email: "notify_email_messages",
    inApp: "notify_inapp_messages",
  },
  {
    id: "online",
    label: "Online status",
    description: "When one of your matches comes online.",
    icon: Bell,
    email: "notify_email_online",
    inApp: "notify_inapp_online",
  },
  {
    id: "projects",
    label: "Project activity",
    description: "Applications, task updates and files in your project rooms.",
    icon: FolderKanban,
    email: "notify_email_projects",
    inApp: "notify_inapp_projects",
  },
];

const NotificationSettings = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = "Notification settings | ArtistrySynk";
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        navigate("/auth");
        return;
      }
      setUserId(auth.user.id);

      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", auth.user.id)
        .maybeSingle();

      if (error) {
        toast.error("Failed to load notification settings");
      } else if (data) {
        const row = data as Record<string, boolean | null>;
        setPrefs((prev) => {
          const next = { ...prev };
          (Object.keys(defaults) as Array<keyof Prefs>).forEach((k) => {
            next[k] = row[k as string] ?? defaults[k];
          });
          return next;
        });
      }
      setLoading(false);
    };
    load();
  }, [navigate]);

  const toggle = (key: keyof Prefs, value: boolean) =>
    setPrefs((prev) => ({ ...prev, [key]: value }));

  const setAll = (channel: "email" | "inApp", value: boolean) =>
    setPrefs((prev) => {
      const next = { ...prev };
      TYPES.forEach((t) => {
        next[channel === "email" ? t.email : t.inApp] = value;
      });
      return next;
    });

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from("user_settings").upsert(
      { user_id: userId, ...prefs, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    setSaving(false);
    if (error) toast.error("Failed to save notification settings");
    else toast.success("Notification settings saved");
  };

  return (
    <main className="container max-w-3xl px-4 py-8 pt-24">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/settings")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to settings
      </Button>

      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Bell className="h-6 w-6 text-primary" aria-hidden="true" />
          Notification settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Choose exactly which alerts reach your inbox and which stay in the app. See everything you
          received in your{" "}
          <Link to="/notifications" className="text-primary underline-offset-4 hover:underline">
            notifications inbox
          </Link>
          .
        </p>
      </header>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mail className="h-5 w-5" aria-hidden="true" />
                Channels
              </CardTitle>
              <CardDescription>
                Master switches. Turning a channel off silences every type below for that channel.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="email-master">Email notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send alerts to the email on your account.
                  </p>
                </div>
                <Switch
                  id="email-master"
                  aria-label="Enable email notifications"
                  checked={prefs.email_notifications}
                  onCheckedChange={(v) => toggle("email_notifications", v)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="inapp-master">In-app notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Show alerts in the bell and notifications inbox.
                  </p>
                </div>
                <Switch
                  id="inapp-master"
                  aria-label="Enable in-app notifications"
                  checked={prefs.push_notifications}
                  onCheckedChange={(v) => toggle("push_notifications", v)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-2">
              <CardTitle className="text-lg">Alerts by type</CardTitle>
              <CardDescription>
                Toggle email and in-app delivery for each kind of activity.
              </CardDescription>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setAll("email", true)}>
                  All emails on
                </Button>
                <Button variant="outline" size="sm" onClick={() => setAll("email", false)}>
                  All emails off
                </Button>
                <Button variant="outline" size="sm" onClick={() => setAll("inApp", true)}>
                  All in-app on
                </Button>
                <Button variant="outline" size="sm" onClick={() => setAll("inApp", false)}>
                  All in-app off
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="hidden grid-cols-[1fr_auto_auto] items-center gap-6 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid">
                <span>Type</span>
                <span className="w-14 text-center">Email</span>
                <span className="w-14 text-center">In-app</span>
              </div>
              {TYPES.map((t, i) => {
                const Icon = t.icon;
                return (
                  <div key={t.id}>
                    {i > 0 && <Separator className="my-1" />}
                    <div className="grid grid-cols-1 gap-3 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-6">
                      <div className="flex gap-3">
                        <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium">{t.label}</p>
                          <p className="text-sm text-muted-foreground">{t.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:w-14 sm:justify-center">
                        <span className="text-xs text-muted-foreground sm:hidden">Email</span>
                        <Switch
                          aria-label={`Email alerts for ${t.label}`}
                          checked={prefs[t.email] && prefs.email_notifications}
                          disabled={!prefs.email_notifications}
                          onCheckedChange={(v) => toggle(t.email, v)}
                        />
                      </div>
                      <div className="flex items-center gap-2 sm:w-14 sm:justify-center">
                        <span className="text-xs text-muted-foreground sm:hidden">In-app</span>
                        <Switch
                          aria-label={`In-app alerts for ${t.label}`}
                          checked={prefs[t.inApp] && prefs.push_notifications}
                          disabled={!prefs.push_notifications}
                          onCheckedChange={(v) => toggle(t.inApp, v)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save preferences
            </Button>
          </div>
        </div>
      )}
    </main>
  );
};

export default NotificationSettings;