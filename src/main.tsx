import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import "./index.css";

// PWA: Register service worker (only in production, not in iframes/previews)
const isInIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
const isPreviewHost = window.location.hostname.includes("id-preview--") || window.location.hostname.includes("lovableproject.com");

if ("serviceWorker" in navigator && !isInIframe && !isPreviewHost) {
  let hasReloadedForServiceWorker = false;

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      registration.update().catch(() => {});

      const notifyWaiting = (worker: ServiceWorker) => {
        window.dispatchEvent(new CustomEvent("pwa-update-available", { detail: worker }));
      };

      // Already-waiting worker (e.g. user came back after an update was staged)
      if (registration.waiting && navigator.serviceWorker.controller) {
        notifyWaiting(registration.waiting);
      }

      // New worker found — watch for it to become installed while another controls the page
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            notifyWaiting(newWorker);
          }
        });
      });

      // Poll for updates every 30 minutes while the tab is open
      setInterval(() => registration.update().catch(() => {}), 30 * 60 * 1000);

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (hasReloadedForServiceWorker) return;
        hasReloadedForServiceWorker = true;
        window.location.reload();
      });
    } catch {
      // Ignore service worker registration failures
    }
  });
} else if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <App />
  </ThemeProvider>
);
