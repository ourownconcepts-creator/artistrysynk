import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/app-shell/AppShell";
import StudioManage from "@/pages/StudioManage";

export const Route = createFileRoute("/studios/$handle/manage")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Manage studio — ArtistrySynk" },
      { name: "description", content: "Manage your studio profile, team and gear on ArtistrySynk." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <AppShell title="Manage studio">
        <StudioManage />
      </AppShell>
    </ProtectedRoute>
  ),
});