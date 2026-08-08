import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { PageTransition } from "@/components/layout/PageTransition";
import WhoLikedYou from "@/pages/WhoLikedYou";

export const Route = createFileRoute("/who-liked-you")({
  component: () => (
    <ProtectedRoute>
      <Navbar />
      <PageTransition>
        <WhoLikedYou />
      </PageTransition>
    </ProtectedRoute>
  ),
});