// Captures the original Error out-of-band so server.ts can recover the stack
// when h3 has already swallowed the throw into a generic 500 Response.

import { isBenignTransportError } from "./benignErrors";

let lastCapturedError: { error: unknown; at: number } | undefined;
const TTL_MS = 5_000;

function record(error: unknown) {
  // Client disconnects (Error: aborted, ECONNRESET) are transport noise, not
  // app failures — recording them would surface a phantom runtime error.
  if (isBenignTransportError(error)) return;
  lastCapturedError = { error, at: Date.now() };
}

// h3's HTTPError serializes to {"status":500,"unhandled":true,"message":"HTTPError"} —
// no stack, no cause — so a plain console.error(error) reaches the log pipeline with
// the failure detail stripped. Expand Error-like args into a string that keeps the
// message, stack, and the full cause chain.
const CAUSE_DEPTH_LIMIT = 5;
const DESCRIPTION_LENGTH_LIMIT = 8_000;

export function describeError(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < CAUSE_DEPTH_LIMIT && current != null; depth++) {
    if (!(current instanceof Error)) {
      parts.push(typeof current === "string" ? current : safeStringify(current));
      break;
    }
    const label = depth === 0 ? "" : "caused by: ";
    const status = describeStatus(current);
    parts.push(`${label}${current.stack ?? `${current.name}: ${current.message}`}${status}`);
    current = current.cause;
  }
  return parts.join("\n").slice(0, DESCRIPTION_LENGTH_LIMIT);
}

function describeStatus(error: Error): string {
  const { status, statusCode } = error as { status?: unknown; statusCode?: unknown };
  const value = status ?? statusCode;
  return typeof value === "number" ? ` (status ${value})` : "";
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function isErrorLike(value: unknown): value is Error {
  return value instanceof Error;
}

// Wrap console.error so errors logged by any layer — including h3's internal
// unhandled-error logging, which this file cannot hook directly — are both
// recorded for consumeLastCapturedError and expanded before serialization.
const originalConsoleError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  // Never let a client disconnect reach the log pipeline: the platform's error
  // reporter scrapes console.error output and would surface `Error: aborted`
  // (from node:_http_server abortIncoming) as an app runtime error.
  if (args.some((arg) => isErrorLike(arg) && isBenignTransportError(arg))) return;
  if (
    args.length > 0 &&
    args.every((arg) => typeof arg === "string" && isBenignTransportError(arg))
  ) {
    return;
  }

  const expanded = args.map((arg) => {
    if (!isErrorLike(arg)) return arg;
    record(arg);
    return describeError(arg);
  });
  originalConsoleError(...expanded);
};

if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("error", (event) => record((event as ErrorEvent).error ?? event));
  globalThis.addEventListener("unhandledrejection", (event) =>
    record((event as PromiseRejectionEvent).reason),
  );
}

// Node raises `Error: aborted` at the socket level (abortIncoming/socketOnClose)
// when the browser navigates away or refreshes mid-request. It arrives as an
// uncaught exception with no request context, so it must be swallowed here or it
// is reported as a crash. Anything else is re-thrown untouched.
type NodeProcess = {
  on?: (event: string, listener: (value: unknown) => void) => void;
  listenerCount?: (event: string) => number;
};
const nodeProcess = (globalThis as { process?: NodeProcess }).process;
if (typeof nodeProcess?.on === "function") {
  nodeProcess.on("uncaughtException", (error: unknown) => {
    if (isBenignTransportError(error)) return;
    record(error);
    throw error;
  });
  nodeProcess.on("unhandledRejection", (reason: unknown) => {
    if (isBenignTransportError(reason)) return;
    record(reason);
  });
}

export function consumeLastCapturedError(): unknown {
  if (!lastCapturedError) return undefined;
  if (Date.now() - lastCapturedError.at > TTL_MS) {
    lastCapturedError = undefined;
    return undefined;
  }
  const { error } = lastCapturedError;
  lastCapturedError = undefined;
  return error;
}