import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/app-shell/AppShell";
import OpenProjects from "@/pages/OpenProjects";

export const Route = createFileRoute("/open-projects")({
  component: () => (
    <ProtectedRoute>
      <AppShell title="Open roles">
        <OpenProjects />
      </AppShell>
    </ProtectedRoute>
  ),
});
