import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { PageTransition } from "@/components/layout/PageTransition";
import LocationDiscovery from "@/pages/LocationDiscovery";

export const Route = createFileRoute("/explore/nearby")({
  component: () => (
    <ProtectedRoute>
      <Navbar />
      <PageTransition>
        <LocationDiscovery />
      </PageTransition>
    </ProtectedRoute>
  ),
});