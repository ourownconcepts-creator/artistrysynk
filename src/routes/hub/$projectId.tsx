import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import CollaborationHub from "@/pages/CollaborationHub";

export const Route = createFileRoute("/hub/$projectId")({
  head: () => ({
    meta: [
      { title: "Collaboration Hub | ArtistrySynk" },
      {
        name: "description",
        content: "Run your project: members, timeline, tasks, files, meetings, notes and deliverables in one workspace.",
      },
      { property: "og:title", content: "Collaboration Hub | ArtistrySynk" },
      {
        property: "og:description",
        content: "Run your project: members, timeline, tasks, files, meetings, notes and deliverables in one workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <CollaborationHub />
    </ProtectedRoute>
  ),
});