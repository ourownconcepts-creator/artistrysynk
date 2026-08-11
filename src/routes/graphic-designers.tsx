import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import DisciplineLanding from "@/pages/DisciplineLanding";
import { getDisciplineBySlug } from "@/lib/seoLandings";
import { buildPageHead, breadcrumbJsonLd } from "@/lib/seoHead";

export const Route = createFileRoute("/graphic-designers")({
  head: () => {
    const landing = getDisciplineBySlug("graphic-designers");
    return buildPageHead({
      path: "/graphic-designers",
      title: `${landing?.title ?? "Creative talent"} | ArtistrySynk`,
      description:
        landing?.description ??
        "Browse creative professionals on ArtistrySynk, view portfolios and start collaborating.",
      keywords: landing?.keywords,
      jsonLd: [
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: landing?.heading ?? "Creatives", path: "/graphic-designers" },
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