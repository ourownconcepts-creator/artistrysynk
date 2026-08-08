import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { PageTransition } from "@/components/layout/PageTransition";
import Profile from "@/pages/Profile";

export const Route = createFileRoute("/profile/")({
  component: () => (
    <ProtectedRoute>
      <Navbar />
      <PageTransition>
        <Profile />
      </PageTransition>
    </ProtectedRoute>
  ),
});