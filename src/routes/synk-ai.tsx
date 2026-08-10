import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import SynkAI from "@/pages/SynkAI";

export const Route = createFileRoute("/synk-ai")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Synk AI Creative Assistant | ArtistrySynk" },
      {
        name: "description",
        content:
          "Synk AI helps you improve your profile, write captions and proposals, and find the right collaborators.",
      },
      { property: "og:title", content: "Synk AI Creative Assistant | ArtistrySynk" },
      {
        property: "og:description",
        content: "Your in-app creative co-pilot for profiles, captions, proposals and collaborator ideas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <SynkAI />
    </ProtectedRoute>
  ),
});