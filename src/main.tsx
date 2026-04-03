import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import "./index.css";

// PWA: Register service worker (only in production, not in iframes/previews)
const isInIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
const isPreviewHost = window.location.hostname.includes("id-preview--") || window.location.hostname.includes("lovableproject.com");

if ('serviceWorker' in navigator && !isInIframe && !isPreviewHost) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
} else if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <App />
  </ThemeProvider>
);
