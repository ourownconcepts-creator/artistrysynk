import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Inbox from "@/pages/Inbox";

export const Route = createFileRoute("/messages/")({
  head: () => ({
    meta: [
      { title: "Inbox | ArtistrySynk" },
      { name: "description", content: "Your matches, chats and new connections in one place." },
      { property: "og:title", content: "Inbox | ArtistrySynk" },
      { property: "og:description", content: "Your matches, chats and new connections in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <Inbox />
    </ProtectedRoute>
  ),
});
