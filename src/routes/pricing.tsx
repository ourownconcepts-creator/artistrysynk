import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import Pricing from "@/pages/Pricing";
import { buildPageHead, breadcrumbJsonLd } from "@/lib/seoHead";

export const Route = createFileRoute("/pricing")({
  head: () =>
    buildPageHead({
      path: "/pricing",
      title: "Pricing - Simple & Transparent | ArtistrySynk",
      description: "Start free and upgrade when you're ready. Unlimited matches and messaging, with Pro plans for verified badges and advanced collaboration features.",
      keywords: "ArtistrySynk pricing, creative collaboration cost, artist network pricing, free creative platform",
      jsonLd: [breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Pricing", path: "/pricing" }])],
    }),
  component: () => (
    <PageTransition>
      <Pricing />
    </PageTransition>
  ),
});