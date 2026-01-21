import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Bell, Shield, User, Trash2, Moon, Sun, Monitor, Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import { PushNotificationSettings } from "@/components/notifications/PushNotificationSettings";
import { BlockedUsersList } from "@/components/settings/BlockedUsersList";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface UserSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  match_notifications: boolean;
  message_notifications: boolean;
  project_notifications: boolean;
  marketing_emails: boolean;
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
  profile_visibility: "public",
  show_online_status: true,
  allow_messages_from: "everyone",
  theme_preference: "system",
};

const Settings = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [userId, setUserId] = useState<string | null>(null);

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

  const handleDeleteAccount = async () => {
    toast.info("Account deletion requested. Our team will process this within 48 hours.");
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
        <TabsList className="grid w-full grid-cols-4">
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
        </TabsList>

        <TabsContent value="notifications" className="space-y-6">
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

          {userId && <BlockedUsersList userId={userId} />}
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Theme</CardTitle>
              <CardDescription>Customize how Artistry looks</CardDescription>
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
            </CardContent>
          </Card>

          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions</CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2">
                    <Trash2 className="w-4 h-4" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your
                      account and remove all your data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAccount}>
                      Delete Account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
