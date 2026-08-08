import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { PageTransition } from "@/components/layout/PageTransition";
import Settings from "@/pages/Settings";

export const Route = createFileRoute("/settings/")({
  component: () => (
    <ProtectedRoute>
      <Navbar />
      <PageTransition>
        <Settings />
      </PageTransition>
    </ProtectedRoute>
  ),
});