import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/app-shell/AppShell";
import CollaborationRoom from "@/pages/CollaborationRoom";

export const Route = createFileRoute("/projects/$projectId")({
  component: () => (
    <ProtectedRoute>
      <AppShell title="Project room" back>
        <CollaborationRoom />
      </AppShell>
    </ProtectedRoute>
  ),
});
