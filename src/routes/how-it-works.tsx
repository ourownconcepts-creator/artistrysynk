import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import HowItWorksPage from "@/pages/HowItWorksPage";
import { buildPageHead, breadcrumbJsonLd, SITE_URL } from "@/lib/seoHead";
import artistryTutorialVideoAsset from "@/assets/artistry-tutorial.asset.json";

const TUTORIAL_VIDEO_URL = `${SITE_URL}${artistryTutorialVideoAsset.url}`;
const TUTORIAL_POSTER_URL = `${SITE_URL}/videos/artistry-tutorial-poster.jpg`;

const tutorialVideoJsonLd = {
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: "How ArtistrySynk Works - Find Your Creative Match",
  description:
    "Watch how creatives use ArtistrySynk to create a profile, discover collaborators, match and connect, and create together.",
  thumbnailUrl: [TUTORIAL_POSTER_URL],
  uploadDate: "2026-09-21",
  duration: "PT10S",
  contentUrl: TUTORIAL_VIDEO_URL,
  embedUrl: `${SITE_URL}/how-it-works`,
  publisher: {
    "@type": "Organization",
    name: "ArtistrySynk",
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/favicon.png`,
    },
  },
};

export const Route = createFileRoute("/how-it-works")({
  head: () =>
    buildPageHead({
      path: "/how-it-works",
      title: "How It Works - Find Your Creative Match | ArtistrySynk",
      description: "Four simple steps to finding your perfect creative collaborator: create a profile, discover creatives, match & connect, and create together.",
      keywords: "how to find collaborators, creative matching process, artist networking, music collaboration steps",
      jsonLd: [
        breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "How It Works", path: "/how-it-works" }]),
        tutorialVideoJsonLd,
      ],
    }),
  component: () => (
    <PageTransition>
      <HowItWorksPage />
    </PageTransition>
  ),
});