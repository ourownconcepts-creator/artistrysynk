import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import StudioPublic from "@/pages/StudioPublic";
import { fetchPublicStudio, type PublicStudio } from "@/lib/studios";
import { ogImageMeta } from "@/lib/ogImage";

const BASE = "https://artistrysynk.app";

export const Route = createFileRoute("/studios/$handle/")({
  loader: async ({ params }) => {
    try {
      return { studio: await fetchPublicStudio(params.handle), handle: params.handle };
    } catch {
      return { studio: null as PublicStudio | null, handle: params.handle };
    }
  },
  head: ({ loaderData }) => {
    const studio = loaderData?.studio ?? null;
    const handle = loaderData?.handle ?? "";
    const title = studio
      ? `${studio.name} — ${studio.org_type.replace(/_/g, " ")} on ArtistrySynk`
      : "Studio — ArtistrySynk";
    const description = studio
      ? (studio.tagline || studio.bio || `${studio.name} on ArtistrySynk — team, gear and published work.`).slice(0, 155)
      : "Discover studios, agencies and labels on ArtistrySynk.";
    const image = studio?.cover_url || studio?.logo_url || null;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "profile" },
        { property: "og:url", content: `${BASE}/studios/${handle}` },
        { name: "twitter:card", content: "summary_large_image" },
        ...ogImageMeta(image, title),
      ],
      links: [{ rel: "canonical", href: `${BASE}/studios/${handle}` }],
      ...(studio
        ? {
            scripts: [
              {
                type: "application/ld+json",
                children: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "LocalBusiness",
                  name: studio.name,
                  description: description,
                  url: `${BASE}/studios/${handle}`,
                  ...(studio.logo_url ? { logo: studio.logo_url } : {}),
                  ...(image ? { image } : {}),
                  ...(studio.primary_city || studio.primary_country
                    ? {
                        address: {
                          "@type": "PostalAddress",
                          ...(studio.primary_city ? { addressLocality: studio.primary_city } : {}),
                          ...(studio.primary_country ? { addressCountry: studio.primary_country } : {}),
                        },
                      }
                    : {}),
                }),
              },
            ],
          }
        : {}),
    };
  },
  component: () => (
    <PageTransition>
      <StudioPublic />
    </PageTransition>
  ),
});