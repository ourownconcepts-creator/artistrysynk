import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import Privacy from "@/pages/Privacy";

export const Route = createFileRoute("/privacy")({
  component: () => (
    <PageTransition>
      <Privacy />
    </PageTransition>
  ),
});