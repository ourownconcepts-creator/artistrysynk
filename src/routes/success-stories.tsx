import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import SuccessStories from "@/pages/SuccessStories";
import { buildPageHead, breadcrumbJsonLd } from "@/lib/seoHead";

export const Route = createFileRoute("/success-stories")({
  head: () =>
    buildPageHead({
      path: "/success-stories",
      title: "Success Stories - Creative Collaborations That Inspire | ArtistrySynk",
      description: "Read how musicians, producers, dancers and creatives found their perfect match on ArtistrySynk and created amazing projects together.",
      keywords: "creative success stories, artist collaboration stories, ArtistrySynk testimonials",
      jsonLd: [breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Success Stories", path: "/success-stories" }])],
    }),
  component: () => (
    <PageTransition>
      <SuccessStories />
    </PageTransition>
  ),
});