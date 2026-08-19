/**
 * Installs global client runtime error listeners once and forwards them to the
 * server monitor (deduped client-side to avoid flooding on repeated errors).
 */
import { reportClientError } from "@/lib/error-monitoring.functions";
import { isBenignTransportError, isRecoveredReactError } from "@/lib/benignErrors";
import { reportClientDisconnect } from "@/lib/diagnostics.functions";
import { getClientCorrelationId } from "@/lib/correlation";

let installed = false;
const seen = new Map<string, number>();
const DEDUPE_MS = 60_000;
const MAX_PER_SESSION = 20;
let sent = 0;
const ASSET_RECOVERY_KEY = "artistrysynk_asset_recovery";
const ASSET_RECOVERY_WINDOW_MS = 30_000;
const DISCONNECT_DEDUPE_MS = 15_000;
let lastDisconnectAt = 0;

/**
 * Client aborts / dropped asset loads are not app faults, but they are the other
 * half of a server 5xx incident — record them against the same correlation id.
 */
export function reportDisconnect(reason: string, phase: string) {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (now - lastDisconnectAt < DISCONNECT_DEDUPE_MS) return;
  lastDisconnectAt = now;
  void reportClientDisconnect({
    data: {
      reason: reason.slice(0, 300),
      route: window.location.pathname + window.location.hash,
      phase,
      ...(getClientCorrelationId() ? { correlationId: getClientCorrelationId() as string } : {}),
      userAgent: navigator.userAgent.slice(0, 300),
    },
  }).catch(() => {
    /* diagnostics must never break the app */
  });
}

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

function isLocalAppAsset(source: string): boolean {
  try {
    const url = new URL(source, window.location.href);
    return (
      url.origin === window.location.origin &&
      /(?:^\/src\/|^\/@|\.(?:css|js|mjs)(?:$|\?))/.test(`${url.pathname}${url.search}`)
    );
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
  if (isBenignTransportError(error)) {
    reportDisconnect(describe(error).message || "client abort", "abort");
    return;
  }
  if (isRecoveredReactError(error)) return;
  if (isAssetLoadFailure(error)) {
    reportDisconnect(describe(error).message || "asset load failure", "asset");
    if (recoverFromAssetLoadFailure()) return;
  }
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
      ...(getClientCorrelationId() ? { correlationId: getClientCorrelationId() as string } : {}),
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
      if (source && isLocalAppAsset(source)) {
        reportDisconnect(`failed to load app asset ${source}`, "asset");
        if (recoverFromAssetLoadFailure()) return;
      }
    }
    captureClientError(event.error ?? event.message, "onerror");
  });
  window.addEventListener("unhandledrejection", (event) => {
    captureClientError(event.reason, "unhandledrejection");
  });
}
