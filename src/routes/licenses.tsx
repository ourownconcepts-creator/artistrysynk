import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import Licenses from "@/pages/Licenses";

export const Route = createFileRoute("/licenses")({
  component: () => (
    <PageTransition>
      <Licenses />
    </PageTransition>
  ),
});