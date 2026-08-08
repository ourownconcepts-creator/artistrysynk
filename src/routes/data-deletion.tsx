import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import DataDeletion from "@/pages/DataDeletion";

export const Route = createFileRoute("/data-deletion")({
  component: () => (
    <PageTransition>
      <DataDeletion />
    </PageTransition>
  ),
});