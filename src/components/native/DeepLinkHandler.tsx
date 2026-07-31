import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { App as CapacitorApp } from "@capacitor/app";
import { supabase } from "@/integrations/supabase/client";
import { isNativeApp } from "@/lib/native";

/**
 * Routes native deep links (universal links / custom scheme) into the SPA
 * router and completes OAuth callbacks that arrive as a deep link.
 */
export const DeepLinkHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNativeApp()) return;

    let removeListener: (() => void) | undefined;

    CapacitorApp.addListener("appUrlOpen", async ({ url }) => {
      try {
        const parsed = new URL(url);
        const hash = parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash;
        const hashParams = new URLSearchParams(hash);
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const code = parsed.searchParams.get("code");

        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          navigate("/discover", { replace: true });
          return;
        }

        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
          navigate("/discover", { replace: true });
          return;
        }

        const path = `${parsed.pathname}${parsed.search}`;
        if (path && path !== "/") navigate(path, { replace: true });
      } catch {
        // Ignore malformed deep links
      }
    }).then((handle) => {
      removeListener = () => handle.remove();
    });

    return () => removeListener?.();
  }, [navigate]);

  return null;
};