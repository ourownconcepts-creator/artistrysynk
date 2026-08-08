import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/app-shell/AppShell";
import Profile from "@/pages/Profile";

export const Route = createFileRoute("/profile/")({
  component: () => (
    <ProtectedRoute>
      <AppShell title="Profile">
        <Profile />
      </AppShell>
    </ProtectedRoute>
  ),
});
