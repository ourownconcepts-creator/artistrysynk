import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import LocationLanding from "@/pages/LocationLanding";

export const Route = createFileRoute("/locations/$citySlug")({
  component: () => (
    <PageTransition>
      <LocationLanding />
    </PageTransition>
  ),
});