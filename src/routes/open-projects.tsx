import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { PageTransition } from "@/components/layout/PageTransition";
import OpenProjects from "@/pages/OpenProjects";

export const Route = createFileRoute("/open-projects")({
  component: () => (
    <ProtectedRoute>
      <Navbar />
      <PageTransition>
        <OpenProjects />
      </PageTransition>
    </ProtectedRoute>
  ),
});