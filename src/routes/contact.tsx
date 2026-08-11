import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import Contact from "@/pages/Contact";
import { buildPageHead, breadcrumbJsonLd } from "@/lib/seoHead";

export const Route = createFileRoute("/contact")({
  head: () =>
    buildPageHead({
      path: "/contact",
      title: "Contact Us - Get In Touch | ArtistrySynk",
      description: "Have questions about ArtistrySynk? Contact us by email or phone and our support team will respond within 24 hours.",
      keywords: "contact ArtistrySynk, creative platform support, ArtistrySynk help",
      jsonLd: [breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Contact", path: "/contact" }])],
    }),
  component: () => (
    <PageTransition>
      <Contact />
    </PageTransition>
  ),
});