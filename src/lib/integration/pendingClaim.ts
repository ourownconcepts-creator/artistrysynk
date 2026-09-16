/**
 * Remembers an in-progress partner identity claim so the flow survives the
 * email-confirmation round trip. When a new user opens a claim link, registers,
 * and clicks the confirmation email, the original claim code can be lost from
 * the URL — this keeps it (browser-local, short-lived) so the claim resumes.
 */
const KEY = "artistrysynk.pendingIntegrationClaim";
const TTL_MS = 15 * 60 * 1000; // 15 minutes — long enough for the email round trip

type PendingClaim = { code: string; state?: string; at: number };

export function rememberPendingClaim(code: string, state?: string) {
  if (typeof window === "undefined" || !code) return;
  try {
    const payload: PendingClaim = { code, at: Date.now(), ...(state ? { state } : {}) };
    window.localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* storage unavailable */
  }
}

export function peekPendingClaim(): { code: string; state?: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingClaim;
    if (!parsed?.code || Date.now() - parsed.at > TTL_MS) {
      window.localStorage.removeItem(KEY);
      return null;
    }
    return { code: parsed.code, ...(parsed.state ? { state: parsed.state } : {}) };
  } catch {
    return null;
  }
}

export function clearPendingClaim() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}

/** Path that resumes a remembered claim, or null when nothing is pending. */
export function pendingClaimPath(): string | null {
  const pending = peekPendingClaim();
  if (!pending) return null;
  const params = new URLSearchParams({ code: pending.code });
  if (pending.state) params.set("state", pending.state);
  return `/integration/v1/claim?${params.toString()}`;
}
