import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/app-shell/AppShell";
import Projects from "@/pages/Projects";

export const Route = createFileRoute("/projects/")({
  component: () => (
    <ProtectedRoute>
      <AppShell title="Projects">
        <Projects />
      </AppShell>
    </ProtectedRoute>
  ),
});
