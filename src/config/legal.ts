/**
 * Legal / compliance configuration.
 *
 * These are deliberately PLACEHOLDERS where the real values have not been
 * supplied by the business. Nothing here is invented: the company details and
 * regulator-facing addresses must be confirmed by ArtistrySynk before launch.
 *
 * Override any value with the matching VITE_ environment variable.
 */
const env = import.meta.env as Record<string, string | undefined>;

const val = (key: string, fallback: string) => env[`VITE_${key}`]?.trim() || fallback;

export const LEGAL_CONFIG = {
  COMPANY_LEGAL_NAME: val("COMPANY_LEGAL_NAME", "Lomodogs Dot Nigeria Limited"),
  COMPANY_ADDRESS: val("COMPANY_ADDRESS", "[Registered address — to be confirmed], Nigeria"),
  ARTISTRYSYNK_DOMAIN: val("ARTISTRYSYNK_DOMAIN", "https://artistrysynk.app"),
  LEGAL_CONTACT_EMAIL: val("LEGAL_CONTACT_EMAIL", "legal@artistrysynk.app"),
  PRIVACY_EMAIL: val("PRIVACY_EMAIL", "privacy@artistrysynk.app"),
  DPO_EMAIL: val("DPO_EMAIL", "privacy@artistrysynk.app"),
  SUPPORT_EMAIL: val("SUPPORT_EMAIL", "support@artistrysynk.app"),
  COPYRIGHT_EMAIL: val("COPYRIGHT_EMAIL", "copyright@artistrysynk.app"),
  EFFECTIVE_DATE: val("EFFECTIVE_DATE", "9 August 2026"),
} as const;

export type LegalConfigKey = keyof typeof LEGAL_CONFIG;

/** Replaces {{TOKEN}} placeholders in stored legal content with configured values. */
export const resolveLegalTokens = (content: string): string =>
  content.replace(/\{\{([A-Z_]+)\}\}/g, (match, key: string) =>
    key in LEGAL_CONFIG ? LEGAL_CONFIG[key as LegalConfigKey] : match,
  );

/** Minimum age for an ArtistrySynk account. */
export const MINIMUM_AGE = 18;
