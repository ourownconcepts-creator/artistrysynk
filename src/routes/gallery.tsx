import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { PageTransition } from "@/components/layout/PageTransition";
import Gallery from "@/pages/Gallery";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Portfolio Gallery — Search Creative Work | ArtistrySynk" },
      {
        name: "description",
        content:
          "Browse the ArtistrySynk portfolio gallery and filter creative work instantly by role, skill tag and media type.",
      },
      { property: "og:title", content: "Portfolio Gallery — Search Creative Work | ArtistrySynk" },
      {
        property: "og:description",
        content:
          "Search music, video, images and docs from creatives worldwide, filtered by role, skill and media type.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <Navbar />
      <PageTransition>
        <Gallery />
      </PageTransition>
    </ProtectedRoute>
  ),
});
