import { useEffect, useState } from "react";
import { Link, useNavigate } from "@/lib/router-compat";
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
  BellRing,
  Heart,
  Sparkles,
  MessageCircle,
  Users,
  FolderKanban,
  Mail,
  Loader2,
  ArrowLeft,
  BadgeCheck,
  Handshake,
} from "lucide-react";

type PrefKey =
  | "notify_email_likes" | "notify_inapp_likes"
  | "notify_email_discovery" | "notify_inapp_discovery"
  | "notify_email_matches" | "notify_inapp_matches"
  | "notify_email_messages" | "notify_inapp_messages"
  | "notify_email_online" | "notify_inapp_online"
  | "notify_email_projects" | "notify_inapp_projects"
  | "notify_email_verification" | "notify_inapp_verification"
  | "notify_email_intros" | "notify_inapp_intros";

type PushKey =
  | "notify_push_invites"
  | "notify_push_invite_responses"
  | "notify_push_role_requests"
  | "notify_push_room_activity";

type Prefs = Record<PrefKey, boolean> & Record<PushKey, boolean> & {
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
  notify_email_verification: true,
  notify_inapp_verification: true,
  notify_email_intros: true,
  notify_inapp_intros: true,
  notify_push_invites: true,
  notify_push_invite_responses: true,
  notify_push_role_requests: true,
  notify_push_room_activity: true,
};

const PUSH_TYPES: Array<{ key: PushKey; label: string; description: string }> = [
  {
    key: "notify_push_invites",
    label: "Project invites",
    description: "Push alert when someone invites you to a project room.",
  },
  {
    key: "notify_push_invite_responses",
    label: "Invite responses",
    description: "Push alert when a creative accepts or declines your invite.",
  },
  {
    key: "notify_push_role_requests",
    label: "Role approvals",
    description: "Push alert for role change requests and decisions.",
  },
  {
    key: "notify_push_room_activity",
    label: "Room activity",
    description: "Push alert for milestones, uploads and member updates.",
  },
];

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
  {
    id: "verification",
    label: "Verification updates",
    description:
      "Review progress, requests for more documents, approvals and rejections with next steps.",
    icon: BadgeCheck,
    email: "notify_email_verification",
    inApp: "notify_inapp_verification",
  },
  {
    id: "intros",
    label: "Trusted introductions",
    description:
      "When someone vouches for you, requests an introduction, or accepts your intro request.",
    icon: Handshake,
    email: "notify_email_intros",
    inApp: "notify_inapp_intros",
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
        const row = data as unknown as Record<string, boolean | null>;
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

  /** Mute silences a whole category (email + in-app); unmute re-enables both. */
  const setCategoryMuted = (typeId: string, muted: boolean) =>
    setPrefs((prev) => {
      const type = TYPES.find((t) => t.id === typeId);
      if (!type) return prev;
      return { ...prev, [type.email]: !muted, [type.inApp]: !muted };
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
                const muted = !prefs[t.email] && !prefs[t.inApp];
                return (
                  <div key={t.id}>
                    {i > 0 && <Separator className="my-1" />}
                    <div className="grid grid-cols-1 gap-3 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-6">
                      <div className="flex gap-3">
                        <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{t.label}</p>
                            {muted ? (
                              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                Muted
                              </span>
                            ) : null}
                          </div>
                          <p className="text-sm text-muted-foreground">{t.description}</p>
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs"
                            onClick={() => setCategoryMuted(t.id, !muted)}
                          >
                            {muted ? `Unmute ${t.label.toLowerCase()}` : `Mute ${t.label.toLowerCase()}`}
                          </Button>
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BellRing className="h-5 w-5" aria-hidden="true" />
                Device push alerts
              </CardTitle>
              <CardDescription>
                Control which project-room events reach your phone or desktop as push
                notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {PUSH_TYPES.map((t, i) => (
                <div key={t.key}>
                  {i > 0 && <Separator className="my-1" />}
                  <div className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0 space-y-0.5">
                      <Label htmlFor={t.key}>{t.label}</Label>
                      <p className="text-sm text-muted-foreground">{t.description}</p>
                    </div>
                    <Switch
                      id={t.key}
                      aria-label={`Push alerts for ${t.label}`}
                      checked={prefs[t.key] && prefs.push_notifications}
                      disabled={!prefs.push_notifications}
                      onCheckedChange={(v) => toggle(t.key, v)}
                    />
                  </div>
                </div>
              ))}
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