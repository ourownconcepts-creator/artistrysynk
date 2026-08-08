import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import DisciplineLanding from "@/pages/DisciplineLanding";

export const Route = createFileRoute("/music-producers")({
  component: () => (
    <PageTransition>
      <DisciplineLanding />
    </PageTransition>
  ),
});