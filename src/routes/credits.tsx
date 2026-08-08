import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { PageTransition } from "@/components/layout/PageTransition";
import CreatorCredits from "@/pages/CreatorCredits";

export const Route = createFileRoute("/credits")({
  component: () => (
    <ProtectedRoute>
      <Navbar />
      <PageTransition>
        <CreatorCredits />
      </PageTransition>
    </ProtectedRoute>
  ),
});