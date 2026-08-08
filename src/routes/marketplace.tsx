import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { PageTransition } from "@/components/layout/PageTransition";
import Marketplace from "@/pages/Marketplace";

export const Route = createFileRoute("/marketplace")({
  component: () => (
    <ProtectedRoute>
      <Navbar />
      <PageTransition>
        <Marketplace />
      </PageTransition>
    </ProtectedRoute>
  ),
});