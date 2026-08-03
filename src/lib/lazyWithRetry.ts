import { lazy, type ComponentType } from "react";

const RELOAD_FLAG = "lovable:chunk-reload";

/**
 * Wraps React.lazy so a stale chunk (deploy happened while the tab was open)
 * retries once, then forces a single hard reload instead of a blank screen.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      const mod = await factory();
      sessionStorage.removeItem(RELOAD_FLAG);
      return mod;
    } catch (error) {
      // Retry once — usually enough if the network hiccuped.
      try {
        const mod = await factory();
        sessionStorage.removeItem(RELOAD_FLAG);
        return mod;
      } catch (retryError) {
        const alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG) === "1";
        if (!alreadyReloaded) {
          sessionStorage.setItem(RELOAD_FLAG, "1");
          // Bust caches (incl. service worker) and fetch the new asset manifest.
          if ("caches" in window) {
            try {
              const keys = await caches.keys();
              await Promise.all(keys.map((k) => caches.delete(k)));
            } catch {
              // ignore
            }
          }
          window.location.reload();
          // Keep the promise pending while the page reloads.
          return new Promise<{ default: T }>(() => {});
        }
        throw retryError;
      }
    }
  });
}
