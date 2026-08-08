import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { PageTransition } from "@/components/layout/PageTransition";
import Projects from "@/pages/Projects";

export const Route = createFileRoute("/projects/")({
  component: () => (
    <ProtectedRoute>
      <Navbar />
      <PageTransition>
        <Projects />
      </PageTransition>
    </ProtectedRoute>
  ),
});