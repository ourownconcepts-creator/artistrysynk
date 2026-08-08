import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import LocationsIndex from "@/pages/LocationsIndex";

export const Route = createFileRoute("/locations/")({
  component: () => (
    <PageTransition>
      <LocationsIndex />
    </PageTransition>
  ),
});