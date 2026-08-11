import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { PageTransition } from "@/components/layout/PageTransition";
import VerificationStatus from "@/pages/VerificationStatus";

export const Route = createFileRoute("/verification")({
  component: () => (
    <ProtectedRoute>
      <Navbar />
      <PageTransition>
        <VerificationStatus />
      </PageTransition>
    </ProtectedRoute>
  ),
});