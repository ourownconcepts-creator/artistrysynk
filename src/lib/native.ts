import { Capacitor } from "@capacitor/core";

/** True when running inside the Capacitor native shell (iOS/Android). */
export const isNativeApp = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

export const nativePlatform = (): "ios" | "android" | "web" => {
  try {
    const platform = Capacitor.getPlatform();
    return platform === "ios" || platform === "android" ? platform : "web";
  } catch {
    return "web";
  }
};

/** Canonical public origin used for OAuth redirects from the native shell. */
export const PUBLIC_ORIGIN = "https://artistrysynk.app";

/**
 * OAuth redirect target. On the web we stay on the current origin; in the
 * native shell we use the published universal-link callback so Apple/Google
 * accept the redirect and the deep link returns into the app.
 */
export const getOAuthRedirectUri = (): string =>
  isNativeApp() ? `${PUBLIC_ORIGIN}/auth/callback` : window.location.origin;