/**
 * Consent decisions are captured at sign-up, before a session may exist
 * (email confirmation, OAuth round-trips). They are held locally and flushed
 * to the server as soon as the user is authenticated.
 */
import { recordConsents } from "@/lib/legal.functions";

const KEY = "as_pending_consents";

export type PendingConsent = {
  consentType: "legal_acceptance" | "marketing" | "age_confirmation" | "personalisation" | "ai_features";
  documentSlug?: string;
  granted: boolean;
};

export type PendingConsentPayload = {
  entries: PendingConsent[];
  context: string;
};

export const storePendingConsents = (payload: PendingConsentPayload) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* storage unavailable — consent is re-requested by the acceptance banner */
  }
};

export const readPendingConsents = (): PendingConsentPayload | null => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingConsentPayload) : null;
  } catch {
    return null;
  }
};

export const clearPendingConsents = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
};

/** Safe to call on every sign-in; a no-op when there is nothing pending. */
export const flushPendingConsents = async () => {
  const payload = readPendingConsents();
  if (!payload || payload.entries.length === 0) return;
  try {
    await recordConsents({ data: payload });
    clearPendingConsents();
  } catch {
    /* keep it queued and retry on the next sign-in */
  }
};

/** The consent set produced by the sign-up form. */
export const buildSignupConsents = (opts: {
  acceptedTerms: boolean;
  confirmedAge: boolean;
  marketing: boolean;
}): PendingConsentPayload => ({
  context: "signup",
  entries: [
    { consentType: "legal_acceptance", documentSlug: "terms", granted: opts.acceptedTerms },
    { consentType: "legal_acceptance", documentSlug: "privacy", granted: opts.acceptedTerms },
    {
      consentType: "legal_acceptance",
      documentSlug: "community-guidelines",
      granted: opts.acceptedTerms,
    },
    { consentType: "age_confirmation", granted: opts.confirmedAge },
    { consentType: "marketing", granted: opts.marketing },
  ],
});
