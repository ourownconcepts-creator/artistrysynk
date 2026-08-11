import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { PageTransition } from "@/components/layout/PageTransition";
import Talent from "@/pages/Talent";

export const Route = createFileRoute("/talent")({
  head: () => ({
    meta: [
      { title: "Talent scouting — ArtistrySynk" },
      {
        name: "description",
        content:
          "Scout creatives who are open to opportunities, with privacy-preserving candidate profiles and introduction requests.",
      },
      { property: "og:title", content: "Talent scouting — ArtistrySynk" },
      {
        property: "og:description",
        content: "Find creatives open to collaborations, paid work and signings on ArtistrySynk.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <Navbar />
      <PageTransition>
        <Talent />
      </PageTransition>
    </ProtectedRoute>
  ),
});