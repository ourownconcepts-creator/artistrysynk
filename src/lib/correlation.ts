/**
 * End-to-end correlation IDs.
 *
 * The SSR entry stamps every document response with `x-correlation-id` and
 * injects the same value as a <meta> tag. The browser reads it back and attaches
 * it to every client error / disconnect report, so a server 5xx and the client
 * abort that followed it can be joined in the admin diagnostics view.
 *
 * Client-safe: no server-only imports.
 */
export const CORRELATION_HEADER = "x-correlation-id";
export const CORRELATION_META = "x-correlation-id";

const SESSION_KEY = "artistrysynk_correlation_id";

export function newCorrelationId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `cid_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

/** Accepts only ids we generated (or a sane upstream trace id). */
export function sanitizeCorrelationId(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().slice(0, 80);
  return /^[A-Za-z0-9._:-]{8,80}$/.test(trimmed) ? trimmed : null;
}

/** The correlation id for the current document, stable for the whole session. */
export function getClientCorrelationId(): string | null {
  if (typeof document === "undefined") return null;
  const meta = document.querySelector<HTMLMetaElement>(`meta[name="${CORRELATION_META}"]`);
  const fromDocument = sanitizeCorrelationId(meta?.content);
  try {
    if (fromDocument) {
      window.sessionStorage.setItem(SESSION_KEY, fromDocument);
      return fromDocument;
    }
    const stored = sanitizeCorrelationId(window.sessionStorage.getItem(SESSION_KEY));
    if (stored) return stored;
    const generated = newCorrelationId();
    window.sessionStorage.setItem(SESSION_KEY, generated);
    return generated;
  } catch {
    return fromDocument;
  }
}
