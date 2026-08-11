import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import HowToFindAMusicProducer from "@/pages/blog/HowToFindAMusicProducer";
import { buildPageHead, breadcrumbJsonLd, absoluteUrl, DEFAULT_OG_IMAGE } from "@/lib/seoHead";

const PATH = "/blog/how-to-find-a-music-producer";
const TITLE = "How to Find a Music Producer: A Complete Guide | ArtistrySynk";
const DESCRIPTION =
  "Learn how to find the right music producer for your sound — what to look for, red flags to avoid, and how to match with vetted producers on ArtistrySynk.";

export const Route = createFileRoute("/blog/how-to-find-a-music-producer")({
  head: () =>
    buildPageHead({
      path: PATH,
      title: TITLE,
      description: DESCRIPTION,
      ogType: "article",
      keywords:
        "how to find a music producer, music producer, hire music producer, beatmaker, music collaboration",
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "How to Find a Music Producer: A Complete Guide",
          description: DESCRIPTION,
          image: DEFAULT_OG_IMAGE,
          url: absoluteUrl(PATH),
          mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(PATH) },
          datePublished: "2026-02-01",
          author: { "@type": "Organization", name: "ArtistrySynk" },
          publisher: {
            "@type": "Organization",
            name: "ArtistrySynk",
            logo: { "@type": "ImageObject", url: absoluteUrl("/logo.png") },
          },
        },
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: "How to Find a Music Producer", path: PATH },
        ]),
      ],
    }),
  component: () => (
    <PageTransition>
      <HowToFindAMusicProducer />
    </PageTransition>
  ),
});