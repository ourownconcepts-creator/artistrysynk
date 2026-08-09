import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { isBenignTransportError } from "./lib/benignErrors";
import { renderErrorPage } from "./lib/error-page";
import {
  CORRELATION_HEADER,
  CORRELATION_META,
  newCorrelationId,
  sanitizeCorrelationId,
} from "./lib/correlation";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(
  response: Response,
  correlationId: string,
  route: string,
): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  const error = consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`);
  console.error(`[${correlationId}]`, error);
  void recordServerFailure(correlationId, route, error, 500);
  return errorResponse(correlationId);
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

function errorResponse(correlationId: string): Response {
  return new Response(renderErrorPage(correlationId), {
    status: 500,
    headers: {
      "content-type": "text/html; charset=utf-8",
      [CORRELATION_HEADER]: correlationId,
    },
  });
}

async function recordServerFailure(
  correlationId: string,
  route: string,
  error: unknown,
  status: number,
): Promise<void> {
  try {
    const { recordDiagnosticEvent } = await import("./lib/diagnostics.server");
    await recordDiagnosticEvent({
      kind: "server-5xx",
      correlationId,
      route,
      httpStatus: status,
      phase: "ssr",
      reason: error instanceof Error ? error.message : String(error),
    });
  } catch {
    /* diagnostics must never mask the original failure */
  }
}

async function recordDisconnect(
  correlationId: string,
  route: string,
  reason: string,
  userAgent: string | null,
): Promise<void> {
  try {
    const { recordDiagnosticEvent } = await import("./lib/diagnostics.server");
    await recordDiagnosticEvent({
      kind: "client-disconnect",
      correlationId,
      route,
      reason,
      phase: "ssr",
      httpStatus: 499,
      userAgent,
    });
  } catch {
    /* best effort */
  }
}

/**
 * Streams the document through untouched apart from injecting the correlation id
 * as a <meta> tag in the first chunk that contains </head>, so the browser can
 * echo it back on client errors without buffering the SSR stream.
 */
function withCorrelationMeta(response: Response, correlationId: string): Response {
  const headers = new Headers(response.headers);
  headers.set(CORRELATION_HEADER, correlationId);
  const contentType = headers.get("content-type") ?? "";
  if (!response.body || !contentType.includes("text/html")) {
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }

  const tag = `<meta name="${CORRELATION_META}" content="${correlationId}">`;
  let injected = false;
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      if (injected) {
        controller.enqueue(chunk);
        return;
      }
      const text = decoder.decode(chunk, { stream: true });
      const index = text.indexOf("</head>");
      if (index === -1) {
        controller.enqueue(encoder.encode(text));
        return;
      }
      injected = true;
      controller.enqueue(encoder.encode(`${text.slice(0, index)}${tag}${text.slice(index)}`));
    },
  });

  return new Response(response.body.pipeThrough(transform), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const correlationId =
      sanitizeCorrelationId(request.headers.get(CORRELATION_HEADER)) ?? newCorrelationId();
    let route = "unknown";
    try {
      route = new URL(request.url).pathname;
    } catch {
      /* keep default */
    }

    try {
      // The client already went away (navigation/refresh mid-flight): rendering
      // would only write into a dead socket and raise `Error: aborted`.
      if (request.signal?.aborted) {
        void recordDisconnect(correlationId, route, "request aborted before render", request.headers.get("user-agent"));
        return new Response(null, { status: 499, headers: { [CORRELATION_HEADER]: correlationId } });
      }
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response, correlationId, route);
      return withCorrelationMeta(normalized, correlationId);
    } catch (error) {
      if (isBenignTransportError(error)) {
        void recordDisconnect(
          correlationId,
          route,
          error instanceof Error ? error.message : "client disconnected",
          request.headers.get("user-agent"),
        );
        return new Response(null, { status: 499, headers: { [CORRELATION_HEADER]: correlationId } });
      }
      console.error(`[${correlationId}]`, error);
      void recordServerFailure(correlationId, route, error, 500);
      return errorResponse(correlationId);
    }
  },
};
