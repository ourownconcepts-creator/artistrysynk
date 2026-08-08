import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isNativeApp } from "@/lib/native";

const STORAGE_KEY = "as_cookie_consent";

export type CookieConsent = "all" | "essential";

export const getCookieConsent = (): CookieConsent | null =>
  (localStorage.getItem(STORAGE_KEY) as CookieConsent | null) ?? null;

export const CookieConsentBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isNativeApp()) return;
    if (!getCookieConsent()) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const decide = (choice: CookieConsent) => {
    localStorage.setItem(STORAGE_KEY, choice);
    window.dispatchEvent(new CustomEvent("cookie-consent-change", { detail: choice }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom duration-300"
    >
      <div className="container mx-auto max-w-4xl rounded-xl border border-border bg-card/95 backdrop-blur-sm p-4 shadow-xl flex flex-col md:flex-row md:items-center gap-4">
        <Cookie className="w-6 h-6 text-primary shrink-0" aria-hidden="true" />
        <p className="text-sm text-muted-foreground flex-1">
          We use essential cookies to keep you signed in, and optional cookies to understand how
          ArtistrySynk is used. Read our{" "}
          <Link to="/cookies" className="text-primary hover:underline">
            Cookie Policy
          </Link>
          .
        </p>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => decide("essential")}>
            Essential only
          </Button>
          <Button variant="hero" size="sm" onClick={() => decide("all")}>
            Accept all
          </Button>
        </div>
      </div>
    </div>
  );
};
