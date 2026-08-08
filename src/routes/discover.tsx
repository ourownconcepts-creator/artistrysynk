import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Discover from "@/pages/Discover";

export const Route = createFileRoute("/discover")({
  component: () => (
    <ProtectedRoute>
      <Discover />
    </ProtectedRoute>
  ),
});
