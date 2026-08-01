import { useEffect } from "react";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { useTheme } from "next-themes";
import { isNativeApp, nativePlatform } from "@/lib/native";
import { useNativePush } from "@/hooks/useNativePush";

/**
 * Native shell chrome: status bar styling, splash screen dismissal and
 * APNs/FCM push registration. Renders nothing on the web.
 */
export const NativeShell = () => {
  const { resolvedTheme } = useTheme();
  useNativePush();

  useEffect(() => {
    if (!isNativeApp()) return;
    SplashScreen.hide({ fadeOutDuration: 250 }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isNativeApp()) return;
    const dark = resolvedTheme === "dark";

    StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {});
    if (nativePlatform() === "android") {
      StatusBar.setBackgroundColor({ color: dark ? "#0a0a0f" : "#ffffff" }).catch(() => {});
    }
  }, [resolvedTheme]);

  return null;
};