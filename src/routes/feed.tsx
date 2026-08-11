import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/app-shell/AppShell";
import CollaborationFeed from "@/pages/CollaborationFeed";
import { buildPageHead } from "@/lib/seoHead";

export const Route = createFileRoute("/feed")({
  head: () =>
    buildPageHead({
      path: "/feed",
      title: "Collaboration feed | ArtistrySynk",
      description: "Live collaboration requests from creatives across the network.",
      noIndex: true,
    }),
  component: () => (
    <ProtectedRoute>
      <AppShell title="Collaborate">
        <CollaborationFeed />
      </AppShell>
    </ProtectedRoute>
  ),
});
