import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import ForcePasswordChange from "@/pages/ForcePasswordChange";

export const Route = createFileRoute("/force-password-change")({
  component: () => (
    <PageTransition>
      <ForcePasswordChange />
    </PageTransition>
  ),
});