import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import DisciplineLanding from "@/pages/DisciplineLanding";

export const Route = createFileRoute("/software-developers")({
  component: () => (
    <PageTransition>
      <DisciplineLanding />
    </PageTransition>
  ),
});