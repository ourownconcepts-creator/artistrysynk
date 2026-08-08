import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import Careers from "@/pages/Careers";

export const Route = createFileRoute("/careers")({
  component: () => (
    <PageTransition>
      <Careers />
    </PageTransition>
  ),
});