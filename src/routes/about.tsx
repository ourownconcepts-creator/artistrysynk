import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import About from "@/pages/About";
import { buildPageHead, breadcrumbJsonLd } from "@/lib/seoHead";

export const Route = createFileRoute("/about")({
  head: () =>
    buildPageHead({
      path: "/about",
      title: "About Us - Our Story & Mission | ArtistrySynk",
      description: "Building the home of global creativity, one connection at a time. Learn about our mission to empower creatives and connect talented professionals.",
      keywords: "about ArtistrySynk, global creative platform, creative networking, creative community",
      jsonLd: [breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "About", path: "/about" }])],
    }),
  component: () => (
    <PageTransition>
      <About />
    </PageTransition>
  ),
});