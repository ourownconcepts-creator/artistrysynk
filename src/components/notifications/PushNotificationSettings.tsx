import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export const PushNotificationSettings = () => {
  const { 
    isSupported, 
    isSubscribed, 
    permission, 
    loading, 
    subscribe, 
    unsubscribe,
    sendLocalNotification 
  } = usePushNotifications();

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const handleTest = () => {
    sendLocalNotification('Test Notification', {
      body: 'Push notifications are working correctly!',
      tag: 'test'
    });
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="w-5 h-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Push notifications are not supported in your browser.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="w-5 h-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Get instant alerts for new matches and messages
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="push-toggle">Enable Push Notifications</Label>
            <p className="text-sm text-muted-foreground">
              {permission === 'denied' 
                ? 'Blocked - Please enable in browser settings'
                : isSubscribed 
                  ? 'You will receive browser notifications' 
                  : 'Enable to receive browser notifications'}
            </p>
          </div>
          <Switch
            id="push-toggle"
            checked={isSubscribed}
            onCheckedChange={handleToggle}
            disabled={loading || permission === 'denied'}
          />
        </div>

        {isSubscribed && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-3">Notification Types</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="notify-matches">New Matches</Label>
                <Switch id="notify-matches" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="notify-messages">New Messages</Label>
                <Switch id="notify-messages" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="notify-projects">Project Updates</Label>
                <Switch id="notify-projects" defaultChecked />
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button 
            variant="outline" 
            onClick={handleToggle}
            disabled={loading || permission === 'denied'}
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isSubscribed ? 'Disable Notifications' : 'Enable Notifications'}
          </Button>
          {isSubscribed && (
            <Button variant="secondary" onClick={handleTest}>
              <Bell className="w-4 h-4 mr-2" />
              Test
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
