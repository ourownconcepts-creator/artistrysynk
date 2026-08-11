import { useState, useEffect } from "react";
import { useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { openCookiePreferences } from "@/components/legal/CookieConsentBanner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Bell, Shield, User, Moon, Sun, Monitor, Loader2, Scale, FileText, Cookie, Trash, ExternalLink, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { PushNotificationSettings } from "@/components/notifications/PushNotificationSettings";
import { PrivacyCenterCard } from "@/components/settings/PrivacyCenterCard";
import { VisibilityModeCard } from "@/components/settings/VisibilityModeCard";
import { UsernamePicker } from "@/components/settings/UsernamePicker";
import { IdentityCard } from "@/components/settings/IdentityCard";
import { TrustedCircleCard } from "@/components/settings/TrustedCircleCard";
import { PrivacyRequestsCard } from "@/components/settings/PrivacyRequestsCard";
import { BlockedUsersList } from "@/components/settings/BlockedUsersList";
import { MutedUsersList } from "@/components/settings/MutedUsersList";
import { UserSessions } from "@/components/profile/UserSessions";
import { DataExportCard } from "@/components/settings/DataExportCard";
import { AccountDeletionCard } from "@/components/settings/AccountDeletionCard";

interface UserSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  match_notifications: boolean;
  message_notifications: boolean;
  project_notifications: boolean;
  marketing_emails: boolean;
  match_online_notifications: boolean;
  match_activity_digest: boolean;
  profile_visibility: string;
  show_online_status: boolean;
  allow_messages_from: string;
  theme_preference: string;
}

const defaultSettings: UserSettings = {
  email_notifications: true,
  push_notifications: true,
  match_notifications: true,
  message_notifications: true,
  project_notifications: true,
  marketing_emails: false,
  match_online_notifications: true,
  match_activity_digest: true,
  profile_visibility: "public",
  show_online_status: true,
  allow_messages_from: "everyone",
  theme_preference: "system",
};

const Settings = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [userId, setUserId] = useState<string | null>(null);

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/auth", { replace: true });
  };

  useEffect(() => {
    const loadSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUserId(user.id);

      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        toast.error("Failed to load settings");
      } else if (data) {
        setSettings({
          email_notifications: data.email_notifications ?? true,
          push_notifications: data.push_notifications ?? true,
          match_notifications: data.match_notifications ?? true,
          message_notifications: data.message_notifications ?? true,
          project_notifications: data.project_notifications ?? true,
          marketing_emails: data.marketing_emails ?? false,
          match_online_notifications: (data as any).match_online_notifications ?? true,
          match_activity_digest: (data as any).match_activity_digest ?? true,
          profile_visibility: data.profile_visibility ?? "public",
          show_online_status: data.show_online_status ?? true,
          allow_messages_from: data.allow_messages_from ?? "everyone",
          theme_preference: data.theme_preference ?? "system",
        });
        if (data.theme_preference) {
          setTheme(data.theme_preference);
        }
      }
      setLoading(false);
    };

    loadSettings();
  }, [navigate, setTheme]);

  const saveSettings = async () => {
    if (!userId) return;
    setSaving(true);

    const { error } = await supabase
      .from("user_settings")
      .upsert({
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      toast.error("Failed to save settings");
    } else {
      toast.success("Settings saved successfully");
    }
    setSaving(false);
  };

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    if (key === "theme_preference" && typeof value === "string") {
      setTheme(value);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences and privacy</p>
      </div>

      <Tabs defaultValue="notifications" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Privacy</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Sun className="w-4 h-4" />
            <span className="hidden sm:inline">Appearance</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="gap-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Account</span>
          </TabsTrigger>
          <TabsTrigger value="legal" className="gap-2">
            <Scale className="w-4 h-4" />
            <span className="hidden sm:inline">Legal</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Alerts by type</CardTitle>
              <CardDescription>
                Fine-tune email and in-app alerts for likes, discovery, matches, messages, online
                status and project activity.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => navigate("/settings/notifications")}>
                <Bell className="mr-2 h-4 w-4" />
                Open notification settings
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Choose what emails you want to receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive emails about your activity</p>
                </div>
                <Switch
                  checked={settings.email_notifications}
                  onCheckedChange={(v) => updateSetting("email_notifications", v)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Match Notifications</Label>
                  <p className="text-sm text-muted-foreground">Get notified when you have new matches</p>
                </div>
                <Switch
                  checked={settings.match_notifications}
                  onCheckedChange={(v) => updateSetting("match_notifications", v)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Message Notifications</Label>
                  <p className="text-sm text-muted-foreground">Get notified about new messages</p>
                </div>
                <Switch
                  checked={settings.message_notifications}
                  onCheckedChange={(v) => updateSetting("message_notifications", v)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Project Updates</Label>
                  <p className="text-sm text-muted-foreground">Get notified about project activity</p>
                </div>
                <Switch
                  checked={settings.project_notifications}
                  onCheckedChange={(v) => updateSetting("project_notifications", v)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Marketing Emails</Label>
                  <p className="text-sm text-muted-foreground">Receive tips, updates and offers</p>
                </div>
                <Switch
                  checked={settings.marketing_emails}
                  onCheckedChange={(v) => updateSetting("marketing_emails", v)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Match Activity Digest</Label>
                  <p className="text-sm text-muted-foreground">Daily email summarizing what your matches have been up to</p>
                </div>
                <Switch
                  checked={settings.match_activity_digest}
                  onCheckedChange={(v) => updateSetting("match_activity_digest", v)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Match Online Alerts (Push)</Label>
                  <p className="text-sm text-muted-foreground">Push notification when a match comes online (throttled to once per hour)</p>
                </div>
                <Switch
                  checked={settings.match_online_notifications}
                  onCheckedChange={(v) => updateSetting("match_online_notifications", v)}
                />
              </div>
            </CardContent>
          </Card>

          <PushNotificationSettings />
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Visibility</CardTitle>
              <CardDescription>Control who can see your profile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Who can see your profile?</Label>
                <Select
                  value={settings.profile_visibility}
                  onValueChange={(v) => updateSetting("profile_visibility", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Everyone</SelectItem>
                    <SelectItem value="matches_only">Matches Only</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Online Status</Label>
                  <p className="text-sm text-muted-foreground">Let others see when you're online</p>
                </div>
                <Switch
                  checked={settings.show_online_status}
                  onCheckedChange={(v) => updateSetting("show_online_status", v)}
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Who can message you?</Label>
                <Select
                  value={settings.allow_messages_from}
                  onValueChange={(v) => updateSetting("allow_messages_from", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="everyone">Everyone</SelectItem>
                    <SelectItem value="matches_only">Matches Only</SelectItem>
                    <SelectItem value="nobody">Nobody</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <VisibilityModeCard />
          <UsernamePicker />
          <IdentityCard />
          <TrustedCircleCard />
          <PrivacyCenterCard />
          <PrivacyRequestsCard />

          {userId && <BlockedUsersList userId={userId} />}
          {userId && <MutedUsersList userId={userId} />}
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Theme</CardTitle>
              <CardDescription>Customize how ArtistrySynk looks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <Button
                  variant={settings.theme_preference === "light" ? "default" : "outline"}
                  className="flex flex-col gap-2 h-auto py-4"
                  onClick={() => updateSetting("theme_preference", "light")}
                >
                  <Sun className="w-6 h-6" />
                  <span>Light</span>
                </Button>
                <Button
                  variant={settings.theme_preference === "dark" ? "default" : "outline"}
                  className="flex flex-col gap-2 h-auto py-4"
                  onClick={() => updateSetting("theme_preference", "dark")}
                >
                  <Moon className="w-6 h-6" />
                  <span>Dark</span>
                </Button>
                <Button
                  variant={settings.theme_preference === "system" ? "default" : "outline"}
                  className="flex flex-col gap-2 h-auto py-4"
                  onClick={() => updateSetting("theme_preference", "system")}
                >
                  <Monitor className="w-6 h-6" />
                  <span>System</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Management</CardTitle>
              <CardDescription>Manage your account settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" onClick={() => navigate("/edit-profile")}>
                Edit Profile
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleSignOut}
                aria-label="Sign out of your account"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </CardContent>
          </Card>

          {userId && <UserSessions userId={userId} />}

          <DataExportCard />

          <AccountDeletionCard />
        </TabsContent>

        <TabsContent value="legal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Legal Center</CardTitle>
              <CardDescription>Policies, terms and your data rights</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "Privacy Policy", desc: "How we collect, use and protect your data", to: "/privacy", icon: Shield },
                { label: "Terms of Service", desc: "The rules for using ArtistrySynk", to: "/terms", icon: FileText },
                { label: "Cookie Policy", desc: "Cookies and similar technologies we use", to: "/cookies", icon: Cookie },
                { label: "Account & Data Deletion", desc: "Request deletion of your account and data", to: "/data-deletion", icon: Trash },
                { label: "Open Source Licenses", desc: "Third-party software attributions", to: "/licenses", icon: Scale },
              ].map((item) => (
                <button
                  key={item.to}
                  type="button"
                  onClick={() => navigate(item.to)}
                  aria-label={`Open ${item.label}`}
                  className="w-full flex items-center gap-3 rounded-lg border border-border p-4 text-left hover:bg-accent/10 hover:border-primary/40 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <item.icon className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
                  <span className="flex-1">
                    <span className="block font-medium">{item.label}</span>
                    <span className="block text-sm text-muted-foreground">{item.desc}</span>
                  </span>
                  <ExternalLink className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Support & Privacy Requests</CardTitle>
              <CardDescription>Need help or have a privacy question?</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => navigate("/contact")}>
                Contact Support
              </Button>
              <Button
                variant="outline"
                onClick={() => openCookiePreferences()}
              >
                Reset Cookie Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-8 flex justify-end">
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Save Changes
        </Button>
      </div>
    </div>
  );
};

export default Settings;
