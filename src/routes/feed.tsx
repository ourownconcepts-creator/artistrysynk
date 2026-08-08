import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/app-shell/AppShell";
import CollaborationFeed from "@/pages/CollaborationFeed";

export const Route = createFileRoute("/feed")({
  component: () => (
    <ProtectedRoute>
      <AppShell title="Collaborate">
        <CollaborationFeed />
      </AppShell>
    </ProtectedRoute>
  ),
});
