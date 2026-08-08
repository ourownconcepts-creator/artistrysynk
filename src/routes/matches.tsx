import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { PageTransition } from "@/components/layout/PageTransition";
import Matches from "@/pages/Matches";

export const Route = createFileRoute("/matches")({
  component: () => (
    <ProtectedRoute>
      <Navbar />
      <PageTransition>
        <Matches />
      </PageTransition>
    </ProtectedRoute>
  ),
});