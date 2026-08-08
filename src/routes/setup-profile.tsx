import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { PageTransition } from "@/components/layout/PageTransition";
import SetupProfile from "@/pages/SetupProfile";

export const Route = createFileRoute("/setup-profile")({
  component: () => (
    <ProtectedRoute>
      <Navbar />
      <PageTransition>
        <SetupProfile />
      </PageTransition>
    </ProtectedRoute>
  ),
});