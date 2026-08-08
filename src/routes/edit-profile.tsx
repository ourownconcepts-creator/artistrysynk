import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { PageTransition } from "@/components/layout/PageTransition";
import EditProfile from "@/pages/EditProfile";

export const Route = createFileRoute("/edit-profile")({
  component: () => (
    <ProtectedRoute>
      <Navbar />
      <PageTransition>
        <EditProfile />
      </PageTransition>
    </ProtectedRoute>
  ),
});