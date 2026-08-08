import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { PageTransition } from "@/components/layout/PageTransition";
import Discover from "@/pages/Discover";

export const Route = createFileRoute("/discover")({
  component: () => (
    <ProtectedRoute>
      <Navbar />
      <PageTransition>
        <Discover />
      </PageTransition>
    </ProtectedRoute>
  ),
});