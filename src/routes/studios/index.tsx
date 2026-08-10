import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import StudiosDirectory from "@/pages/StudiosDirectory";

export const Route = createFileRoute("/studios/")({
  head: () => ({
    meta: [
      { title: "Creative Studios, Agencies & Labels — ArtistrySynk" },
      {
        name: "description",
        content:
          "Browse recording studios, creative agencies, labels and production companies. See their team, gear and work, then book a session.",
      },
      { property: "og:title", content: "Creative Studios, Agencies & Labels — ArtistrySynk" },
      {
        property: "og:description",
        content: "Discover studios and creative houses on ArtistrySynk — team, gear and published work.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <PageTransition>
      <StudiosDirectory />
    </PageTransition>
  ),
});