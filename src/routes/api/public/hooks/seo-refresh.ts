import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

/**
 * External trigger: notifies search engines about newly published pages and
 * pings the (live) sitemap index. Callers must present the project's
 * publishable key in the `apikey` header.
 *
 * POST { "paths": ["/blog/new-post", "/studios/foo"] }
 */
export const Route = createFileRoute("/api/public/hooks/seo-refresh")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected =
          process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"] ?? "";
        const provided =
          request.headers.get("apikey") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          "";
        if (!expected || provided !== expected) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        let paths: string[] = [];
        try {
          const body = (await request.json()) as { paths?: unknown };
          if (Array.isArray(body.paths)) {
            paths = body.paths
              .filter((p): p is string => typeof p === "string" && p.length < 300)
              .map((p) => (p.startsWith("/") ? p : `/${p}`))
              .filter((p) => !p.startsWith("//") && !p.includes(".."));
          }
        } catch {
          paths = [];
        }

        const sitemap = await import("@/lib/sitemap.server");
        if (paths.length === 0) {
          paths = [
            ...sitemap.staticEntries,
            ...sitemap.blogEntries(),
            ...sitemap.landingEntries(),
            ...(await sitemap.studioEntries()),
          ].map((e) => e.path);
        }

        const { submitUrlsForIndexing } = await import("@/lib/seoPing.server");
        const submission = await submitUrlsForIndexing(paths.slice(0, 500));

        return Response.json({
          submitted: submission.urls.length,
          submittedAt: submission.submittedAt,
          results: submission.results,
          sitemap: `https://artistrysynk.app/sitemap.xml`,
        });
      },
    },
  },
});