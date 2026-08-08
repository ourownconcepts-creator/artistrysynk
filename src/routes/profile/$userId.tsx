import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import PublicProfile from "@/pages/PublicProfile";
import { supabase } from "@/integrations/supabase/client";
import { buildProfileHead, type SeoProfile } from "@/lib/profileSeo";

export const Route = createFileRoute("/profile/$userId")({
  loader: async ({ params }) => {
    try {
      const { data } = await supabase.rpc("get_public_profile", { _identifier: params.userId });
      const row = (data as SeoProfile[] | null)?.[0] ?? null;
      return { seo: row, slug: params.userId };
    } catch {
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