import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import DisciplineLanding from "@/pages/DisciplineLanding";
import { getDisciplineBySlug } from "@/lib/seoLandings";
import { buildPageHead, breadcrumbJsonLd } from "@/lib/seoHead";

export const Route = createFileRoute("/dancers")({
  head: () => {
    const landing = getDisciplineBySlug("dancers");
    return buildPageHead({
      path: "/dancers",
      title: `${landing?.title ?? "Creative talent"} | ArtistrySynk`,
      description:
        landing?.description ??
        "Browse creative professionals on ArtistrySynk, view portfolios and start collaborating.",
      keywords: landing?.keywords,
      jsonLd: [
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: landing?.heading ?? "Creatives", path: "/dancers" },
        ]),
      ],
    });
  },
  component: () => (
    <PageTransition>
      <DisciplineLanding />
    </PageTransition>
  ),
});