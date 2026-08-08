import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import Index from "@/pages/Index";

export const Route = createFileRoute("/")({
  component: () => (
    <PageTransition>
      <Index />
    </PageTransition>
  ),
});