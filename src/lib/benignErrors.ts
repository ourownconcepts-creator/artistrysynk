/**
 * Transport-level noise that is NOT an application fault: the browser or proxy
 * closed the connection mid-request (navigation away, refresh, tab close), so
 * Node's http server raises `Error: aborted` / ECONNRESET. These must never be
 * recorded as runtime errors or trigger ops alerts.
 *
 * Dependency-free on purpose — imported by src/lib/error-capture.ts.
 */
const BENIGN_PATTERNS: RegExp[] = [
  /^aborted$/i,
  /\baborted\b.*abortIncoming/i,
  /abortIncoming/i,
  /socketOnClose/i,
  /ECONNRESET/i,
  /ECONNABORTED/i,
  /EPIPE/i,
  /socket hang up/i,
  /request aborted/i,
  /the (?:user|operation) aborted a request/i,
  /^AbortError\b/i,
  /signal is aborted without reason/i,
  /ResizeObserver loop/i,
];

/**
 * React error #520 is a *recovery* notice: concurrent rendering hit a problem and
 * React re-rendered the root synchronously. The UI is intact, so it must not be
 * recorded as a runtime fault.
 */
const RECOVERED_REACT_PATTERNS: RegExp[] = [
  /Minified React error #520\b/i,
  /error during concurrent rendering but React was able to recover/i,
];

export function isRecoveredReactError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (!message) return false;
  return RECOVERED_REACT_PATTERNS.some((pattern) => pattern.test(message));
}

const BENIGN_CODES = new Set([
  "ABORT_ERR",
  "ECONNABORTED",
  "ECONNRESET",
  "EPIPE",
  "ERR_HTTP2_STREAM_ERROR",
  "ERR_STREAM_PREMATURE_CLOSE",
]);

export function isBenignTransportError(error: unknown): boolean {
  const code =
    error != null && typeof error === "object" && "code" in error
      ? (error as { code?: unknown }).code
      : undefined;
  if (typeof code === "string" && BENIGN_CODES.has(code)) return true;
  const message =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : typeof error === "string"
        ? error
        : "";
  const stack = error instanceof Error ? (error.stack ?? "") : "";
  const haystack = `${message}\n${stack}`;
  if (!message && !stack) return false;
  if (error instanceof Error && error.name === "AbortError") return true;
  return BENIGN_PATTERNS.some((pattern) => pattern.test(haystack));
}
