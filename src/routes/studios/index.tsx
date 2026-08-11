import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import StudiosDirectory from "@/pages/StudiosDirectory";
import { buildPageHead, breadcrumbJsonLd } from "@/lib/seoHead";

export const Route = createFileRoute("/studios/")({
  head: () =>
    buildPageHead({
      path: "/studios",
      title: "Creative Studios, Agencies & Labels — ArtistrySynk",
      description:
        "Browse recording studios, creative agencies, labels and production companies. See their team, gear and work, then book a session.",
      keywords:
        "recording studios, creative agencies, music labels, production companies, studio directory",
      jsonLd: [
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Studios", path: "/studios" },
        ]),
      ],
    }),
  component: () => (
    <PageTransition>
      <StudiosDirectory />
    </PageTransition>
  ),
});