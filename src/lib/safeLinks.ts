/**
 * Safety helpers for user-generated (UGC) outbound links.
 *
 * Public pages (profiles, studios, project rooms) render URLs that users typed
 * in. Rendering those unchecked lets someone point crawlers and visitors at
 * malware or phishing from our domain, which is exactly what Safe Browsing
 * flags as "harmful content" on a site. Every UGC link must go through
 * `sanitizeExternalUrl` and carry `UGC_LINK_REL`.
 */

/** rel value for any link a user supplied: no SEO endorsement, no referrer leak. */
export const UGC_LINK_REL = "nofollow ugc noopener noreferrer";

/** File extensions we never link to directly from public UGC surfaces. */
const BLOCKED_EXTENSIONS = /\.(apk|exe|msi|dmg|bat|cmd|scr|jar|vbs|ps1|sh|dll|com|iso)$/i;

/**
 * Returns a safe absolute https/http URL, or null when the value is unusable
 * or dangerous (javascript:, data:, blob:, executable download, etc.).
 */
export function sanitizeExternalUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  if (!parsed.hostname.includes(".")) return null;
  if (BLOCKED_EXTENSIONS.test(parsed.pathname)) return null;

  return parsed.toString();
}

/** True when the URL is safe to render as a UGC link. */
export const isSafeExternalUrl = (raw: string | null | undefined) =>
  sanitizeExternalUrl(raw) !== null;