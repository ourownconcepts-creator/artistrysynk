import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { PageTransition } from "@/components/layout/PageTransition";
import CollaborationRoom from "@/pages/CollaborationRoom";

export const Route = createFileRoute("/projects/$projectId")({
  component: () => (
    <ProtectedRoute>
      <Navbar />
      <PageTransition>
        <CollaborationRoom />
      </PageTransition>
    </ProtectedRoute>
  ),
});