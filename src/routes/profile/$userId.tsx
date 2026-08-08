import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import PublicProfile from "@/pages/PublicProfile";
import { supabase } from "@/integrations/supabase/client";
import { getRoleLabel } from "@/lib/creativeRoles";

const BASE = "https://artistrysynk.app";

type SeoProfile = {
  full_name: string;
  username: string;
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  roles: string[] | null;
};

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
  head: ({ loaderData }) => {
    const p = loaderData?.seo;
    const slug = loaderData?.slug ?? "";
    if (!p) {
      return {
        meta: [
          { title: "Creative profile — ArtistrySynk" },
          { name: "description", content: "Discover creative professionals and collaborate on ArtistrySynk." },
          { property: "og:title", content: "Creative profile — ArtistrySynk" },
          { property: "og:description", content: "Discover creative professionals and collaborate on ArtistrySynk." },
          { property: "og:type", content: "profile" },
          { name: "twitter:card", content: "summary_large_image" },
        ],
      };
    }

    const roleLabels = (p.roles ?? []).map((r) => getRoleLabel(r as never));
    const title = `${p.full_name} (@${p.username})${roleLabels[0] ? ` — ${roleLabels[0]}` : ""} | ArtistrySynk`;
    const description = (
      p.bio?.slice(0, 155) ||
      `${p.full_name}${roleLabels.length ? ` — ${roleLabels.join(", ")}` : ""}${
        p.location ? ` based in ${p.location}` : ""
      }. See portfolio highlights and collaborate on ArtistrySynk.`
    ).trim();
    const url = `${BASE}/profile/${p.username || slug}`;
    const image = p.cover_image_url || p.avatar_url;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "profile" },
        { property: "og:url", content: url },
        { property: "og:site_name", content: "ArtistrySynk" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        ...(image && image.startsWith("https://")
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ProfilePage",
            mainEntity: {
              "@type": "Person",
              name: p.full_name,
              alternateName: p.username,
              description: p.bio ?? undefined,
              image: p.avatar_url ?? undefined,
              jobTitle: roleLabels.length ? roleLabels.join(", ") : undefined,
              url,
            },
          }),
        },
      ],
    };
  },
  component: () => (
    <PageTransition>
      <PublicProfile />
    </PageTransition>
  ),
});