import { createFileRoute } from "@tanstack/react-router";

/**
 * Scheduled retention sweep. Called by pg_cron with the project's publishable
 * key in the `apikey` header; nothing here is readable without that key and no
 * personal data is ever returned — only counts.
 */
export const Route = createFileRoute("/api/public/hooks/retention-sweep")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected =
          process.env['SUPABASE_PUBLISHABLE_KEY'] ?? process.env['SUPABASE_ANON_KEY'] ?? "";
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

        const { withRunLog } = await import("@/lib/functionRunLog.server");
        const { runRetentionSweep } = await import("@/lib/retention.server");

        try {
          const result = await withRunLog("retention-sweep", { triggered_by: "schedule" }, () =>
            runRetentionSweep("schedule"),
          );
          const deleted = result.purges.reduce((sum, p) => sum + p.deletedCount, 0);
          return Response.json({
            success: true,
            deleted,
            accountsPurged: result.accountsPurged,
            rules: result.purges.length,
            failures: result.purges.filter((p) => p.status !== "success").map((p) => p.category),
          });
        } catch (err) {
          return new Response(
            JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Sweep failed" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});