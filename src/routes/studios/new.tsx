import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/app-shell/AppShell";
import StudioCreate from "@/pages/StudioCreate";

export const Route = createFileRoute("/studios/new")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Create a studio — ArtistrySynk" },
      {
        name: "description",
        content: "Set up your studio, agency or label page on ArtistrySynk with your team, gear and portfolio.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <AppShell title="Create studio">
        <StudioCreate />
      </AppShell>
    </ProtectedRoute>
  ),
});