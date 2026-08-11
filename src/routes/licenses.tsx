import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import Licenses from "@/pages/Licenses";
import { buildPageHead, breadcrumbJsonLd } from "@/lib/seoHead";

export const Route = createFileRoute("/licenses")({
  head: () =>
    buildPageHead({
      path: "/licenses",
      title: "Open Source Licenses & Attributions | ArtistrySynk",
      description: "Open-source software licenses and third-party attributions used to build the ArtistrySynk web and mobile apps.",
      jsonLd: [breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Licenses", path: "/licenses" }])],
    }),
  component: () => (
    <PageTransition>
      <Licenses />
    </PageTransition>
  ),
});