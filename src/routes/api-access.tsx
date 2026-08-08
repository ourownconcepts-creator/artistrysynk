import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { PageTransition } from "@/components/layout/PageTransition";
import ApiAccess from "@/pages/ApiAccess";

export const Route = createFileRoute("/api-access")({
  component: () => (
    <ProtectedRoute>
      <Navbar />
      <PageTransition>
        <ApiAccess />
      </PageTransition>
    </ProtectedRoute>
  ),
});