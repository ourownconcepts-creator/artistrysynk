import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const reportSchema = z.object({
  message: z.string().min(1).max(500),
  stack: z.string().max(8000).optional(),
  route: z.string().max(300).optional(),
  userAgent: z.string().max(300).optional(),
  mechanism: z.string().max(60).optional(),
  release: z.string().max(60).optional(),
});

/** Client runtime errors are posted here; the handler logs + alerts. */
export const reportClientError = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => reportSchema.parse(input))
  .handler(async ({ data }) => {
    const { reportError } = await import("@/lib/error-monitoring.server");
    return reportError({
      source: "client",
      message: data.message,
      stack: data.stack ?? null,
      route: data.route ?? null,
      userAgent: data.userAgent ?? null,
      mechanism: data.mechanism ?? "onerror",
      release: data.release ?? null,
    });
  });
