import { useCallback, useEffect, useState } from "react";
import { Download, Share, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trackEvent } from "@/components/analytics/AnalyticsProvider";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * The browser fires `beforeinstallprompt` very early — often before React
 * mounts — so it is captured on the window and replayed to the button.
 */
declare global {
  interface Window {
    __installPromptEvent?: BeforeInstallPromptEvent | null;
  }
}

if (typeof window !== "undefined" && !window.__installPromptEvent) {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    window.__installPromptEvent = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new CustomEvent("install-prompt-ready"));
  });
}

const DISMISS_KEY = "as_install_dismissed_at";
/** Re-offer the install button 30 days after a dismissal. */
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const isDismissed = () => {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < DISMISS_TTL_MS;
  } catch {
    return false;
  }
};

export const InstallAppButton = ({ className }: { className?: string }) => {
  const [canPrompt, setCanPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);
  const [dismissed, setDismissed] = useState(true);
  const [iosSafari, setIosSafari] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(!!standalone);
    setDismissed(isDismissed());

    const ua = navigator.userAgent;
    const isIPadOS =
      navigator.platform === "MacIntel" &&
      (navigator as unknown as { maxTouchPoints?: number }).maxTouchPoints! > 1;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || isIPadOS;
    if (isIOS) setPlatform("ios");
    else if (/Android/i.test(ua)) setPlatform("android");
    else setPlatform("desktop");

    // iOS never fires beforeinstallprompt, but Safari does support
    // Add to Home Screen — so it is installable via the help sheet.
    setIosSafari(isIOS && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua));

    setCanPrompt(!!window.__installPromptEvent);
    const ready = () => setCanPrompt(true);
    const installed = () => {
      window.__installPromptEvent = null;
      setIsStandalone(true);
    };
    window.addEventListener("install-prompt-ready", ready);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("install-prompt-ready", ready);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  const handleClick = useCallback(async () => {
    const evt = window.__installPromptEvent;
    if (evt) {
      trackEvent("pwa_install_clicked", { platform, source: "home_button" });
      await evt.prompt();
      const { outcome } = await evt.userChoice;
      trackEvent("pwa_install_choice", { outcome, source: "home_button" });
      window.__installPromptEvent = null;
      setCanPrompt(false);
      return;
    }
    trackEvent("pwa_install_help_opened", { platform });
    setShowHelp(true);
  }, [platform]);

  if (isStandalone) return null;

  return (
    <>
      <Button variant="outline" size="xl" className={className} onClick={handleClick}>
        {canPrompt ? (
          <Download className="mr-2 h-5 w-5 text-secondary" />
        ) : (
          <Smartphone className="mr-2 h-5 w-5 text-secondary" />
        )}
        Install App
      </Button>

      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Install ArtistrySynk</DialogTitle>
            <DialogDescription>
              Add ArtistrySynk to your home screen for a full app experience.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            {platform === "ios" ? (
              <p className="flex flex-wrap items-center gap-1">
                In Safari, tap <Share className="inline h-4 w-4" /> at the bottom, then choose{" "}
                <strong className="text-foreground">Add to Home Screen</strong>.
              </p>
            ) : platform === "android" ? (
              <p>
                Open <strong className="text-foreground">artistrysynk.app</strong> in{" "}
                <strong className="text-foreground">Google Chrome</strong>, tap the menu (⋮) and
                choose <strong className="text-foreground">Install app</strong>.
              </p>
            ) : (
              <p>
                In Chrome or Edge, click the install icon in the address bar, or open the browser
                menu and choose <strong className="text-foreground">Install ArtistrySynk</strong>.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
