import * as StartCore from "@tanstack/react-start";
import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    // Production error monitoring: log the crash and alert ops.
    try {
      const { reportError } = await import("./lib/error-monitoring.server");
      await reportError({
        source: "server",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? (error.stack ?? null) : null,
        route: (() => {
          try {
            return new URL(request.url).pathname;
          } catch {
            return null;
          }
        })(),
        mechanism: "request_middleware",
      });
    } catch (monitorError) {
      console.error("[error-monitoring] failed to record server crash", monitorError);
    }
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests. Some bundled builds resolve this export to
// undefined, which used to crash the whole server entry, so fall back to a
// minimal same-origin check instead of throwing at module load.
const createCsrf = (
  StartCore as unknown as {
    createCsrfMiddleware?: (opts: {
      filter: (ctx: { handlerType?: string }) => boolean;
    }) => ReturnType<typeof createMiddleware>;
  }
).createCsrfMiddleware;

const fallbackCsrfMiddleware = createMiddleware().server(async ({ next, request }) => {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return next();
  const site = request.headers.get("Sec-Fetch-Site");
  if (site && site !== "same-origin" && site !== "none") {
    return new Response("Forbidden", { status: 403 });
  }
  return next();
});

const csrfMiddleware =
  typeof createCsrf === "function"
    ? createCsrf({ filter: (ctx) => ctx.handlerType === "serverFn" })
    : fallbackCsrfMiddleware;

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, csrfMiddleware],
}));