import { useCallback, useEffect, useState } from "react";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";
import { isNativeApp, nativePlatform } from "@/lib/native";

/**
 * Native (APNs/FCM) push notifications for the Capacitor shell.
 * No-ops on the web, where Web Push (usePushNotifications) is used instead.
 */
export const useNativePush = () => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [permission, setPermission] = useState<"granted" | "denied" | "prompt">("prompt");

  const saveToken = useCallback(async (token: string) => {
    const platform = nativePlatform();
    if (platform === "web") return;

    const { data } = await supabase.auth.getUser();
    if (!data.user) return;

    await supabase.from("device_push_tokens").upsert(
      { user_id: data.user.id, token, platform, is_active: true },
      { onConflict: "user_id,token" },
    );
  }, []);

  const register = useCallback(async () => {
    if (!isNativeApp()) return false;

    let status = await PushNotifications.checkPermissions();
    if (status.receive === "prompt" || status.receive === "prompt-with-rationale") {
      status = await PushNotifications.requestPermissions();
    }

    if (status.receive !== "granted") {
      setPermission("denied");
      return false;
    }

    setPermission("granted");
    await PushNotifications.register();
    return true;
  }, []);

  const unregister = useCallback(async () => {
    if (!isNativeApp()) return;
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      await supabase
        .from("device_push_tokens")
        .update({ is_active: false })
        .eq("user_id", data.user.id);
    }
    await PushNotifications.removeAllListeners();
    setIsRegistered(false);
  }, []);

  useEffect(() => {
    if (!isNativeApp()) return;

    const handles: Array<{ remove: () => void }> = [];

    PushNotifications.addListener("registration", (token) => {
      setIsRegistered(true);
      void saveToken(token.value);
    }).then((h) => handles.push(h));

    PushNotifications.addListener("registrationError", (err) => {
      console.error("Native push registration failed", err);
    }).then((h) => handles.push(h));

    PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
      const url = (notification.data as Record<string, string> | undefined)?.url;
      if (url && url.startsWith("/")) window.location.assign(url);
    }).then((h) => handles.push(h));

    void register();

    return () => handles.forEach((h) => h.remove());
  }, [register, saveToken]);

  return { isRegistered, permission, register, unregister };
};