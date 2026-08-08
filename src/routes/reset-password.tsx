import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import ResetPassword from "@/pages/ResetPassword";

export const Route = createFileRoute("/reset-password")({
  component: () => (
    <PageTransition>
      <ResetPassword />
    </PageTransition>
  ),
});