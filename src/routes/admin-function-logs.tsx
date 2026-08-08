import { createFileRoute } from "@tanstack/react-router";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { PageTransition } from "@/components/layout/PageTransition";
import AdminFunctionLogs from "@/pages/AdminFunctionLogs";

export const Route = createFileRoute("/admin-function-logs")({
  head: () => ({
    meta: [
      { title: "Function Run History | ArtistrySynk Admin" },
      { name: "description", content: "Admin view of support and notification job runs, statuses and recent errors." },
      { property: "og:title", content: "Function Run History | ArtistrySynk Admin" },
      { property: "og:description", content: "Monitor support and notification background jobs on ArtistrySynk." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AdminProtectedRoute allowedRoles={["admin", "master_admin", "super_admin"]}>
      <PageTransition>
        <AdminFunctionLogs />
      </PageTransition>
    </AdminProtectedRoute>
  ),
});
