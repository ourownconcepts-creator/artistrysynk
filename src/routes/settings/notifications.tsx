import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { PageTransition } from "@/components/layout/PageTransition";
import NotificationSettings from "@/pages/NotificationSettings";

export const Route = createFileRoute("/settings/notifications")({
  component: () => (
    <ProtectedRoute>
      <Navbar />
      <PageTransition>
        <NotificationSettings />
      </PageTransition>
    </ProtectedRoute>
  ),
});