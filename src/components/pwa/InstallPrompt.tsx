import { useState, useEffect, useCallback } from 'react';
import { X, Download, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Don't show in iframe/preview
    try {
      if (window.self !== window.top) return;
    } catch { return; }
    if (window.location.hostname.includes('id-preview--') || window.location.hostname.includes('lovableproject.com')) return;

    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    setIsStandalone(!!standalone);
    if (standalone) return;

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Show after 20 seconds
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 20000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const handleDismiss = () => {
    setShowPrompt(false);
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
            <img src="/icons/icon-192.png" alt="ArtistrySynk" className="w-12 h-12 rounded-xl" />
            <div>
              <h3 className="font-semibold text-foreground text-sm">Install ArtistrySynk</h3>
              <p className="text-xs text-muted-foreground">Get the full app experience</p>
            </div>
          </div>

          {isIOS ? (
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="flex items-center gap-1">
                Tap <Share className="w-3 h-3 inline" /> then <strong>"Add to Home Screen"</strong>
              </p>
            </div>
          ) : deferredPrompt ? (
            <Button onClick={handleInstall} className="w-full" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Install ArtistrySynk
            </Button>
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
