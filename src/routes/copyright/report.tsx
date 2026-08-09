import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import CopyrightClaim from "@/pages/CopyrightClaim";

export const Route = createFileRoute("/copyright/report")({
  head: () => ({
    meta: [
      { title: "Report copyright infringement | ArtistrySynk" },
      {
        name: "description",
        content:
          "File a copyright takedown notice for content hosted on ArtistrySynk, or track the status of a notice you already submitted.",
      },
      { property: "og:title", content: "Report copyright infringement | ArtistrySynk" },
      {
        property: "og:description",
        content:
          "File a copyright takedown notice for content on ArtistrySynk and track its review status.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <PageTransition>
      <CopyrightClaim />
    </PageTransition>
  ),
});
