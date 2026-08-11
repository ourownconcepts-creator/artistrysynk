import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import HowItWorksPage from "@/pages/HowItWorksPage";
import { buildPageHead, breadcrumbJsonLd } from "@/lib/seoHead";

export const Route = createFileRoute("/how-it-works")({
  head: () =>
    buildPageHead({
      path: "/how-it-works",
      title: "How It Works - Find Your Creative Match | ArtistrySynk",
      description: "Four simple steps to finding your perfect creative collaborator: create a profile, discover creatives, match & connect, and create together.",
      keywords: "how to find collaborators, creative matching process, artist networking, music collaboration steps",
      jsonLd: [breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "How It Works", path: "/how-it-works" }])],
    }),
  component: () => (
    <PageTransition>
      <HowItWorksPage />
    </PageTransition>
  ),
});