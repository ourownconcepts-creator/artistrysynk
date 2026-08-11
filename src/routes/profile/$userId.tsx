import { createFileRoute, redirect } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import PublicProfile from "@/pages/PublicProfile";
import { supabase } from "@/integrations/supabase/client";
import { buildProfileHead, type SeoProfile } from "@/lib/profileSeo";

export const Route = createFileRoute("/profile/$userId")({
  loader: async ({ params }) => {
    try {
      const { data } = await supabase.rpc("get_public_profile", { _identifier: params.userId });
      const row = (data as SeoProfile[] | null)?.[0] ?? null;
      if (!row) {
        // Old handle? Permanently redirect to the member's latest username so
        // shared links and search-engine equity survive a rename.
        const { data: newHandle } = await supabase.rpc("resolve_username_redirect", {
          _handle: params.userId,
        });
        if (typeof newHandle === "string" && newHandle && newHandle !== params.userId) {
          throw redirect({
            to: "/profile/$userId",
            params: { userId: newHandle },
            statusCode: 301,
            replace: true,
          });
        }
      }
      return { seo: row, slug: params.userId };
    } catch (err) {
      if (err && typeof err === "object" && "isRedirect" in err) throw err;
      return { seo: null, slug: params.userId };
    }
  },
  head: ({ loaderData }) => buildProfileHead(loaderData?.seo, loaderData?.slug ?? ""),
  component: () => (
    <PageTransition>
      <PublicProfile />
    </PageTransition>
  ),
});