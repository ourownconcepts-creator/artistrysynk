import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import Careers from "@/pages/Careers";
import { buildPageHead, breadcrumbJsonLd } from "@/lib/seoHead";

export const Route = createFileRoute("/careers")({
  head: () =>
    buildPageHead({
      path: "/careers",
      title: "Careers - Join Our Team | ArtistrySynk",
      description: "Help us build the future of creative collaboration. Explore open roles in engineering, design and marketing with a remote-first culture.",
      keywords: "ArtistrySynk jobs, creative tech jobs, startup careers, remote jobs",
      jsonLd: [breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Careers", path: "/careers" }])],
    }),
  component: () => (
    <PageTransition>
      <Careers />
    </PageTransition>
  ),
});