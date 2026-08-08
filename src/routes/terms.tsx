import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import Terms from "@/pages/Terms";

export const Route = createFileRoute("/terms")({
  component: () => (
    <PageTransition>
      <Terms />
    </PageTransition>
  ),
});