import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import Pricing from "@/pages/Pricing";

export const Route = createFileRoute("/pricing")({
  component: () => (
    <PageTransition>
      <Pricing />
    </PageTransition>
  ),
});