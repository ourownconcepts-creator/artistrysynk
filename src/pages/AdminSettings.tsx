import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Settings, Mail, Bell, Shield, Globe, ArrowLeft, Save } from "lucide-react";
import { PushNotificationSettings } from "@/components/notifications/PushNotificationSettings";

interface AppSettings {
  site_name: string;
  site_description: string;
  contact_email: string;
  support_email: string;
  enable_notifications: boolean;
  enable_email_notifications: boolean;
  maintenance_mode: boolean;
  allow_registrations: boolean;
  require_email_verification: boolean;
  max_portfolio_items: number;
  featured_duration_days: number;
}

const defaultSettings: AppSettings = {
  site_name: "Artistry.ng",
  site_description: "Creative collaboration platform",
  contact_email: "",
  support_email: "",
  enable_notifications: true,
  enable_email_notifications: true,
  maintenance_mode: false,
  allow_registrations: true,
  require_email_verification: false,
  max_portfolio_items: 50,
  featured_duration_days: 7,
};

const AdminSettings = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkAdminAndLoadSettings();
  }, []);

  const checkAdminAndLoadSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/admin/auth");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["super_admin"])
      .single();

    if (!roleData) {
      toast.error("Access denied - Super admin only");
      navigate("/admin");
      return;
    }

    loadSettings();
  };

  const loadSettings = async () => {
    const { data } = await supabase
      .from("admin_settings")
      .select("setting_key, setting_value");

    if (data) {
      const loadedSettings: Partial<AppSettings> = {};
      data.forEach((item) => {
        (loadedSettings as any)[item.setting_key] = item.setting_value;
      });
      setSettings({ ...defaultSettings, ...loadedSettings });
    }
    setLoading(false);
  };

  const saveSettings = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    try {
      for (const [key, value] of Object.entries(settings)) {
        await supabase
          .from("admin_settings")
          .upsert({
            setting_key: key,
            setting_value: value,
            updated_by: user?.id,
            updated_at: new Date().toISOString(),
          }, { onConflict: "setting_key" });
      }
      toast.success("Settings saved successfully");
    } catch (error) {
      toast.error("Failed to save settings");
    }
    setSaving(false);
  };

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-4">
      <div className="max-w-4xl mx-auto py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/super-admin")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Settings className="w-6 h-6" />
                Admin Settings
              </h1>
              <p className="text-muted-foreground">Configure platform settings</p>
            </div>
          </div>
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">
              <Globe className="w-4 h-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="w-4 h-4 mr-2" />
              Email
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="w-4 h-4 mr-2" />
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Basic platform configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Site Name</Label>
                  <Input
                    value={settings.site_name}
                    onChange={(e) => updateSetting("site_name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Site Description</Label>
                  <Textarea
                    value={settings.site_description}
                    onChange={(e) => updateSetting("site_description", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Portfolio Items per User</Label>
                  <Input
                    type="number"
                    value={settings.max_portfolio_items}
                    onChange={(e) => updateSetting("max_portfolio_items", parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Featured Duration (days)</Label>
                  <Input
                    type="number"
                    value={settings.featured_duration_days}
                    onChange={(e) => updateSetting("featured_duration_days", parseInt(e.target.value))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Maintenance Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Temporarily disable the platform for maintenance
                    </p>
                  </div>
                  <Switch
                    checked={settings.maintenance_mode}
                    onCheckedChange={(v) => updateSetting("maintenance_mode", v)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Configure notification preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable In-App Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Show notifications within the platform
                    </p>
                  </div>
                  <Switch
                    checked={settings.enable_notifications}
                    onCheckedChange={(v) => updateSetting("enable_notifications", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send email notifications for important events
                    </p>
                  </div>
                  <Switch
                    checked={settings.enable_email_notifications}
                    onCheckedChange={(v) => updateSetting("enable_email_notifications", v)}
                  />
                </div>
              </CardContent>
            </Card>
            
            <PushNotificationSettings />
          </TabsContent>

          <TabsContent value="email">
            <Card>
              <CardHeader>
                <CardTitle>Email Settings</CardTitle>
                <CardDescription>Configure email addresses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Contact Email</Label>
                  <Input
                    type="email"
                    value={settings.contact_email}
                    onChange={(e) => updateSetting("contact_email", e.target.value)}
                    placeholder="contact@artistry.ng"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Support Email</Label>
                  <Input
                    type="email"
                    value={settings.support_email}
                    onChange={(e) => updateSetting("support_email", e.target.value)}
                    placeholder="support@artistry.ng"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Configure security and access controls</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Allow New Registrations</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow new users to sign up
                    </p>
                  </div>
                  <Switch
                    checked={settings.allow_registrations}
                    onCheckedChange={(v) => updateSetting("allow_registrations", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Email Verification</Label>
                    <p className="text-sm text-muted-foreground">
                      Users must verify their email before accessing features
                    </p>
                  </div>
                  <Switch
                    checked={settings.require_email_verification}
                    onCheckedChange={(v) => updateSetting("require_email_verification", v)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminSettings;
