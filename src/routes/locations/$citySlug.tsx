import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import LocationLanding from "@/pages/LocationLanding";
import { getCityBySlug } from "@/lib/seoLandings";
import { buildPageHead, breadcrumbJsonLd } from "@/lib/seoHead";

export const Route = createFileRoute("/locations/$citySlug")({
  head: ({ params }) => {
    const city = getCityBySlug(params.citySlug);
    const name = city ? `${city.city}, ${city.country}` : "your city";
    return buildPageHead({
      path: `/locations/${params.citySlug}`,
      title: `Creative Talent in ${name} | ArtistrySynk`,
      description: `Find musicians, producers, designers, photographers, dancers and filmmakers in ${name}. View portfolios and collaborate on ArtistrySynk.`,
      keywords: `creatives in ${city?.city ?? ""}, local creative talent, hire creatives ${city?.city ?? ""}`,
      jsonLd: [
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Locations", path: "/locations" },
          { name, path: `/locations/${params.citySlug}` },
        ]),
      ],
    });
  },
  component: () => (
    <PageTransition>
      <LocationLanding />
    </PageTransition>
  ),
});