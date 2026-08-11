import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import Blog from "@/pages/Blog";
import { buildPageHead, breadcrumbJsonLd } from "@/lib/seoHead";

export const Route = createFileRoute("/blog/")({
  head: () =>
    buildPageHead({
      path: "/blog",
      title: "Blog - Creative Collaboration Tips & Industry Insights | ArtistrySynk",
      description: "Read the latest articles on creative collaboration, music production tips, artist networking and industry insights from ArtistrySynk.",
      keywords: "creative blog, music collaboration tips, artist networking, creative professionals blog",
      jsonLd: [breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Blog", path: "/blog" }])],
    }),
  component: () => (
    <PageTransition>
      <Blog />
    </PageTransition>
  ),
});