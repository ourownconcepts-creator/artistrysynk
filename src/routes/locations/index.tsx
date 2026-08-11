import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import LocationsIndex from "@/pages/LocationsIndex";
import { buildPageHead, breadcrumbJsonLd } from "@/lib/seoHead";

export const Route = createFileRoute("/locations/")({
  head: () =>
    buildPageHead({
      path: "/locations",
      title: "Creative Talent by City \u2014 Locations | ArtistrySynk",
      description: "Browse creative professionals by city on ArtistrySynk. Find musicians, producers, designers, photographers and developers near you.",
      keywords: "creatives by city, local creative talent, creative directory, find creatives near me",
      jsonLd: [breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Locations", path: "/locations" }])],
    }),
  component: () => (
    <PageTransition>
      <LocationsIndex />
    </PageTransition>
  ),
});