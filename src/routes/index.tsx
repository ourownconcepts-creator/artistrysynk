import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import Index from "@/pages/Index";
import { buildPageHead, SITE_URL } from "@/lib/seoHead";
import heroVideoAsset from "@/assets/artistry-hero.mp4.asset.json";

const HERO_VIDEO_URL = `${SITE_URL}${heroVideoAsset.url}`;
const HERO_POSTER_URL = `${SITE_URL}/videos/artistry-hero-poster.jpg`;

const heroVideoJsonLd = {
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: "ArtistrySynk — Creatives Connecting Across the Globe",
  description:
    "Watch musicians, photographers, designers, dancers and other creatives connect through ArtistrySynk's global collaboration network.",
  thumbnailUrl: [HERO_POSTER_URL],
  uploadDate: "2026-10-04",
  duration: "PT8S",
  contentUrl: HERO_VIDEO_URL,
  embedUrl: `${SITE_URL}/`,
  publisher: {
    "@type": "Organization",
    name: "ArtistrySynk",
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/favicon.png`,
    },
  },
};

export const Route = createFileRoute("/")({
  head: () =>
    buildPageHead({
      path: "/",
      title: "ArtistrySynk – Create, Connect, Collaborate",
      description: "Connect with creatives worldwide — musicians, designers, photographers, filmmakers, dancers and writers. Match, collaborate and bring your vision to life.",
      keywords: "creative collaboration, artists, musicians, producers, dancers, actors, creative professionals, talent network",
      jsonLd: [heroVideoJsonLd],
    }),
  component: () => (
    <PageTransition>
      <Index />
    </PageTransition>
  ),
});
