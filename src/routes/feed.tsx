import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { PageTransition } from "@/components/layout/PageTransition";
import CollaborationFeed from "@/pages/CollaborationFeed";

export const Route = createFileRoute("/feed")({
  component: () => (
    <ProtectedRoute>
      <Navbar />
      <PageTransition>
        <CollaborationFeed />
      </PageTransition>
    </ProtectedRoute>
  ),
});