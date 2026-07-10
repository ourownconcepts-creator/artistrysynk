import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { trackEvent } from '@/components/analytics/AnalyticsProvider';

export const UpdateBanner = () => {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const worker = (e as CustomEvent<ServiceWorker>).detail;
      setWaitingWorker(worker);
      setShow(true);
      trackEvent('pwa_update_available');
    };
    window.addEventListener('pwa-update-available', handler);
    return () => window.removeEventListener('pwa-update-available', handler);
  }, []);

  const handleRefresh = () => {
    trackEvent('pwa_update_accepted');
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    trackEvent('pwa_update_dismissed');
    setShow(false);
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="fixed top-4 left-4 right-4 z-[60] mx-auto max-w-md"
      >
        <div className="bg-card border border-border rounded-2xl p-4 shadow-2xl backdrop-blur-lg flex items-center gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground text-sm">Update available</h3>
            <p className="text-xs text-muted-foreground">A new version of ArtistrySynk is ready.</p>
          </div>
          <Button size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Dismiss update"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};