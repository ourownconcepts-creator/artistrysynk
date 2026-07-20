import { useState, useEffect, useCallback } from 'react';
import { X, Download, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { trackEvent } from '@/components/analytics/AnalyticsProvider';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [inAppBrowser, setInAppBrowser] = useState<string | null>(null);

  useEffect(() => {
    // Don't show in iframe/preview
    try {
      if (window.self !== window.top) return;
    } catch { return; }
    if (window.location.hostname.includes('id-preview--') || window.location.hostname.includes('lovableproject.com')) return;

    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    setIsStandalone(!!standalone);
    if (standalone) return;

    const ua = navigator.userAgent;
    // iPadOS 13+ reports as MacIntel — detect via touch points
    const isIPadOS = navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1;
    const ios = (/iPad|iPhone|iPod/.test(ua) || isIPadOS) && !(window as any).MSStream;
    setIsIOS(ios);
    const android = /Android/i.test(ua);
    setIsAndroid(android);

    // Detect in-app browsers where Add to Home Screen is unavailable
    if (ios) {
      if (/FBAN|FBAV/i.test(ua)) setInAppBrowser('Facebook');
      else if (/Instagram/i.test(ua)) setInAppBrowser('Instagram');
      else if (/Line/i.test(ua)) setInAppBrowser('Line');
      else if (/Twitter/i.test(ua)) setInAppBrowser('X (Twitter)');
      else if (/TikTok/i.test(ua)) setInAppBrowser('TikTok');
      else if (/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua)) setInAppBrowser('non-Safari');
    }

    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      trackEvent('pwa_install_prompt_available', { platform: ios ? 'ios' : 'other' });
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Fires once the app is actually installed (Android/desktop)
    const installedHandler = () => {
      trackEvent('pwa_installed', { platform: ios ? 'ios' : 'other' });
      localStorage.setItem('pwa-installed', '1');
    };
    window.addEventListener('appinstalled', installedHandler);

    // Show after 6 seconds — mobile users bounce fast, and iOS never fires beforeinstallprompt
    const delay = ios || android ? 6000 : 12000;
    const timer = setTimeout(() => {
      setShowPrompt(true);
      trackEvent('pwa_install_banner_shown', { platform: ios ? 'ios' : android ? 'android' : 'other' });
    }, delay);

    // Also listen for a manual trigger (e.g. after signup)
    const manual = () => setShowPrompt(true);
    window.addEventListener('show-install-prompt', manual);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
      window.removeEventListener('show-install-prompt', manual);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      trackEvent('pwa_install_clicked', { platform: 'android_desktop' });
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      trackEvent('pwa_install_choice', { outcome });
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const handleDismiss = () => {
    setShowPrompt(false);
    trackEvent('pwa_install_dismissed', { platform: isIOS ? 'ios' : 'other' });
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md"
      >
        <div className="bg-card border border-border rounded-2xl p-4 shadow-2xl backdrop-blur-lg">
          <button onClick={handleDismiss} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <img src="/logo.png" alt="ArtistrySynk" className="w-12 h-12 rounded-xl object-contain" />
            <div>
              <h3 className="font-semibold text-foreground text-sm">Install ArtistrySynk</h3>
              <p className="text-xs text-muted-foreground">Get the full app experience</p>
            </div>
          </div>

          {isIOS ? (
            <div
              className="text-xs text-muted-foreground space-y-1"
              onClick={() => trackEvent('pwa_ios_share_hint_viewed')}
            >
              <p className="flex items-center gap-1">
                Tap <Share className="w-3 h-3 inline" /> then <strong>"Add to Home Screen"</strong>
              </p>
            </div>
          ) : deferredPrompt ? (
            <Button onClick={handleInstall} className="w-full" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Install ArtistrySynk
            </Button>
          ) : isAndroid ? (
            <p className="text-xs text-muted-foreground">
              Open your browser menu (⋮) and tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Use your browser menu to add ArtistrySynk to your home screen.
            </p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Hook to trigger install prompt programmatically (on login/signup)
export const useInstallPrompt = () => {
  const triggerInstallPrompt = () => {
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    window.dispatchEvent(new CustomEvent('show-install-prompt'));
  };

  return { triggerInstallPrompt };
};
