import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import FeaturesPage from "@/pages/Features";
import { buildPageHead, breadcrumbJsonLd } from "@/lib/seoHead";

export const Route = createFileRoute("/features")({
  head: () =>
    buildPageHead({
      path: "/features",
      title: "Features - Smart Matching & Collaboration Tools | ArtistrySynk",
      description: "Discover powerful features for creatives: AI-powered matching, real-time collaboration, portfolio showcase, verified profiles, and quick discovery tools.",
      keywords: "creative matching, artist collaboration tools, portfolio showcase, verified creatives, music collaboration",
      jsonLd: [breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Features", path: "/features" }])],
    }),
  component: () => (
    <PageTransition>
      <FeaturesPage />
    </PageTransition>
  ),
});