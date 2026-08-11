import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const auditSchema = z.object({
  baseUrl: z.string().url().max(200).optional(),
  paths: z.array(z.string().max(200)).max(25).optional(),
});

/** Admin-only: fetch key public pages and validate their share-preview tags. */
export const auditSharePreviews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(auditSchema)
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/authz.server");
    await assertAdmin(context.supabase, context.userId);

    const { auditSharePreview, SHARE_AUDIT_PATHS } = await import("@/lib/seoAudit.server");
    const baseUrl = (data.baseUrl ?? "https://artistrysynk.app").replace(/\/$/, "");
    const paths = data.paths?.length ? data.paths : [...SHARE_AUDIT_PATHS];

    const results = [];
    for (const path of paths) {
      results.push(await auditSharePreview(baseUrl, path.startsWith("/") ? path : `/${path}`));
    }

    return {
      baseUrl,
      checkedAt: new Date().toISOString(),
      results,
      errorCount: results.reduce((n, r) => n + r.issues.filter((i) => i.level === "error").length, 0),
      warningCount: results.reduce((n, r) => n + r.issues.filter((i) => i.level === "warning").length, 0),
    };
  });