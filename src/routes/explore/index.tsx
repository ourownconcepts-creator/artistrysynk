import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { PageTransition } from "@/components/layout/PageTransition";
import Explore from "@/pages/Explore";

export const Route = createFileRoute("/explore/")({
  component: () => (
    <ProtectedRoute>
      <Navbar />
      <PageTransition>
        <Explore />
      </PageTransition>
    </ProtectedRoute>
  ),
});