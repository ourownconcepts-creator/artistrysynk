import { useCallback, useEffect, useState } from "react";
import { Link } from "@/lib/router-compat";
import { Cookie, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { isNativeApp } from "@/lib/native";

const STORAGE_KEY = "as_cookie_consent";
const OPEN_EVENT = "cookie-consent-open";
export const COOKIE_CONSENT_EVENT = "cookie-consent-change";

export type CookieCategory = "essential" | "analytics" | "personalisation" | "marketing";

export type CookiePreferences = {
  essential: true;
  analytics: boolean;
  personalisation: boolean;
  marketing: boolean;
  decidedAt: string;
};

const CATEGORIES: { key: Exclude<CookieCategory, "essential">; label: string; blurb: string }[] = [
  {
    key: "analytics",
    label: "Analytics",
    blurb: "Anonymous usage stats so we can see which features are worth keeping.",
  },
  {
    key: "personalisation",
    label: "Personalisation",
    blurb: "Remembers filters and tailors the creatives we surface to you.",
  },
  {
    key: "marketing",
    label: "Marketing",
    blurb: "Measures which campaigns bring creatives to ArtistrySynk.",
  },
];

const ALL_OFF = { analytics: false, personalisation: false, marketing: false };

const base = (extra: Omit<CookiePreferences, "essential" | "decidedAt">): CookiePreferences => ({
  essential: true,
  decidedAt: new Date().toISOString(),
  ...extra,
});

/** Stored preferences, or null when the visitor has not chosen yet. */
export const getCookiePreferences = (): CookiePreferences | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  // Back-compat with the earlier "all" / "essential" string form.
  if (raw === "all") return base({ analytics: true, personalisation: true, marketing: true });
  if (raw === "essential") return base(ALL_OFF);
  try {
    const parsed = JSON.parse(raw) as Partial<CookiePreferences>;
    return base({
      analytics: Boolean(parsed.analytics),
      personalisation: Boolean(parsed.personalisation),
      marketing: Boolean(parsed.marketing),
    });
  } catch {
    return null;
  }
};

/** True when the visitor allowed a given category (essential is always allowed). */
export const hasCookieConsent = (category: CookieCategory): boolean => {
  if (category === "essential") return true;
  const prefs = getCookiePreferences();
  return prefs ? Boolean(prefs[category]) : false;
};

/** Lets any page reopen the banner, e.g. from the Cookie Policy. */
export const openCookiePreferences = () =>
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));

export const CookieConsentBanner = () => {
  const [visible, setVisible] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [choices, setChoices] = useState(ALL_OFF);

  const open = useCallback((detail: boolean) => {
    const prefs = getCookiePreferences();
    setChoices(
      prefs
        ? {
            analytics: prefs.analytics,
            personalisation: prefs.personalisation,
            marketing: prefs.marketing,
          }
        : ALL_OFF,
    );
    setShowDetail(detail);
    setVisible(true);
  }, []);

  useEffect(() => {
    const reopen = () => open(true);
    window.addEventListener(OPEN_EVENT, reopen);
    return () => window.removeEventListener(OPEN_EVENT, reopen);
  }, [open]);

  useEffect(() => {
    if (isNativeApp()) return undefined;
    if (!getCookiePreferences()) {
      const timer = setTimeout(() => open(false), 800);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open]);

  const save = (extra: Omit<CookiePreferences, "essential" | "decidedAt">) => {
    const prefs = base(extra);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: prefs }));
    setVisible(false);
    setShowDetail(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom p-4 duration-300"
    >
      <div className="container mx-auto max-w-4xl space-y-4 rounded-xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <Cookie className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
          <p className="flex-1 text-sm text-muted-foreground">
            Essential cookies keep you signed in. Optional ones help us improve ArtistrySynk — you
            choose, and we remember your choice on this device. Read our{" "}
            <Link to="/cookies" className="text-primary hover:underline">
              Cookie Policy
            </Link>
            .
          </p>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="min-h-11"
              onClick={() => setShowDetail((v) => !v)}
            >
              <Settings2 className="mr-2 h-4 w-4" aria-hidden="true" />
              {showDetail ? "Hide options" : "Customise"}
            </Button>
            <Button variant="outline" size="sm" className="min-h-11" onClick={() => save(ALL_OFF)}>
              Essential only
            </Button>
            <Button
              variant="hero"
              size="sm"
              className="min-h-11"
              onClick={() => save({ analytics: true, personalisation: true, marketing: true })}
            >
              Accept all
            </Button>
          </div>
        </div>

        {showDetail && (
          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Essential</p>
                <p className="text-xs text-muted-foreground">
                  Sign-in, security and preferences. Always on.
                </p>
              </div>
              <Switch checked disabled aria-label="Essential cookies (always on)" />
            </div>

            {CATEGORIES.map((c) => (
              <div key={c.key} className="flex items-start justify-between gap-4">
                <div>
                  <Label htmlFor={`cookie-${c.key}`} className="text-sm font-medium">
                    {c.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">{c.blurb}</p>
                </div>
                <Switch
                  id={`cookie-${c.key}`}
                  checked={choices[c.key]}
                  onCheckedChange={(v) => setChoices((p) => ({ ...p, [c.key]: v }))}
                />
              </div>
            ))}

            <Button size="sm" className="min-h-11" onClick={() => save(choices)}>
              Save my preferences
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
