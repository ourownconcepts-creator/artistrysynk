/**
 * Installs global client runtime error listeners once and forwards them to the
 * server monitor (deduped client-side to avoid flooding on repeated errors).
 */
import { reportClientError } from "@/lib/error-monitoring.functions";
import { isBenignTransportError } from "@/lib/benignErrors";

let installed = false;
const seen = new Map<string, number>();
const DEDUPE_MS = 60_000;
const MAX_PER_SESSION = 20;
let sent = 0;
const ASSET_RECOVERY_KEY = "artistrysynk_asset_recovery";
const ASSET_RECOVERY_WINDOW_MS = 30_000;

function isAssetLoadFailure(value: unknown): boolean {
  const { message } = describe(value);
  return /(?:failed to fetch dynamically imported module|importing a module script failed|loading chunk \d+ failed|failed to load module script)/i.test(
    message,
  );
}

function recoverFromAssetLoadFailure(): boolean {
  try {
    const now = Date.now();
    const previous = Number(window.sessionStorage.getItem(ASSET_RECOVERY_KEY) ?? "0");
    if (now - previous < ASSET_RECOVERY_WINDOW_MS) return false;
    window.sessionStorage.setItem(ASSET_RECOVERY_KEY, String(now));
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}

function describe(value: unknown): { message: string; stack?: string } {
  if (value instanceof Error) return { message: value.message, ...(value.stack ? { stack: value.stack } : {}) };
  if (value instanceof Response) return { message: `Response ${value.status}${value.url ? ` at ${value.url}` : ""}` };
  if (typeof value === "string") return { message: value };
  try {
    return { message: JSON.stringify(value)?.slice(0, 300) ?? String(value) };
  } catch {
    return { message: String(value) };
  }
}

export function captureClientError(error: unknown, mechanism = "manual") {
  if (typeof window === "undefined") return;
  if (isBenignTransportError(error)) return;
  if (isAssetLoadFailure(error) && recoverFromAssetLoadFailure()) return;
  const { message, stack } = describe(error);
  if (!message || sent >= MAX_PER_SESSION) return;
  const key = `${message}|${(stack ?? "").split("\n")[1] ?? ""}`;
  const now = Date.now();
  const last = seen.get(key);
  if (last && now - last < DEDUPE_MS) return;
  seen.set(key, now);
  sent += 1;

  void reportClientError({
    data: {
      message: message.slice(0, 500),
      ...(stack ? { stack: stack.slice(0, 8000) } : {}),
      route: window.location.pathname + window.location.hash,
      userAgent: navigator.userAgent.slice(0, 300),
      mechanism,
    },
  }).catch(() => {
    /* monitoring must never break the app */
  });
}

export function installClientErrorMonitor() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("error", (event) => {
    if (
      event.target instanceof HTMLScriptElement ||
      event.target instanceof HTMLLinkElement
    ) {
      const source = event.target instanceof HTMLScriptElement ? event.target.src : event.target.href;
      if (source && recoverFromAssetLoadFailure()) return;
    }
    captureClientError(event.error ?? event.message, "onerror");
  });
  window.addEventListener("unhandledrejection", (event) => {
    captureClientError(event.reason, "unhandledrejection");
  });
}
