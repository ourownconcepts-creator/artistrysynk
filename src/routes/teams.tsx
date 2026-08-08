import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { PageTransition } from "@/components/layout/PageTransition";
import TeamManagement from "@/pages/TeamManagement";

export const Route = createFileRoute("/teams")({
  component: () => (
    <ProtectedRoute>
      <Navbar />
      <PageTransition>
        <TeamManagement />
      </PageTransition>
    </ProtectedRoute>
  ),
});