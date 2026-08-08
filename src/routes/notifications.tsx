import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { PageTransition } from "@/components/layout/PageTransition";
import Notifications from "@/pages/Notifications";

export const Route = createFileRoute("/notifications")({
  component: () => (
    <ProtectedRoute>
      <Navbar />
      <PageTransition>
        <Notifications />
      </PageTransition>
    </ProtectedRoute>
  ),
});