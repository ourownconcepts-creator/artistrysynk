import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const submitSchema = z.object({
  paths: z.array(z.string().min(1).max(300)).min(1).max(200),
});

/**
 * Any signed-in user can announce a page they just published (their studio,
 * their profile). Only site-relative paths are accepted, so nothing outside
 * artistrysynk.app can be submitted.
 */
export const submitPagesForIndexing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(submitSchema)
  .handler(async ({ data }) => {
    const paths = data.paths
      .map((p) => (p.startsWith("/") ? p : `/${p}`))
      .filter((p) => !p.startsWith("//") && !p.includes(".."));
    if (paths.length === 0) return { submitted: 0 };

    const { submitUrlsForIndexing } = await import("@/lib/seoPing.server");
    const submission = await submitUrlsForIndexing(paths);
    return { submitted: submission.urls.length, results: submission.results };
  });

/** Admin-only: resubmit the whole sitemap surface (static, blog, landing, studios). */
export const resubmitSitemapForIndexing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/authz.server");
    await assertAdmin(context.supabase, context.userId);

    const sitemap = await import("@/lib/sitemap.server");
    const entries = [
      ...sitemap.staticEntries,
      ...sitemap.blogEntries(),
      ...sitemap.landingEntries(),
      ...(await sitemap.studioEntries()),
    ];

    const { submitUrlsForIndexing } = await import("@/lib/seoPing.server");
    const submission = await submitUrlsForIndexing(entries.map((e) => e.path));
    return {
      submitted: submission.urls.length,
      submittedAt: submission.submittedAt,
      results: submission.results,
    };
  });