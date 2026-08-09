import { createFileRoute } from "@tanstack/react-router";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { PageTransition } from "@/components/layout/PageTransition";
import AdminDiagnostics from "@/pages/AdminDiagnostics";

export const Route = createFileRoute("/admin-diagnostics")({
  head: () => ({
    meta: [
      { title: "Error Diagnostics | ArtistrySynk Admin" },
      {
        name: "description",
        content: "Admin view of client disconnect and abort events with timestamps, routes and correlation IDs.",
      },
      { property: "og:title", content: "Error Diagnostics | ArtistrySynk Admin" },
      { property: "og:description", content: "Trace client aborts and server failures on ArtistrySynk." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AdminProtectedRoute allowedRoles={["admin", "master_admin", "super_admin"]}>
      <PageTransition>
        <AdminDiagnostics />
      </PageTransition>
    </AdminProtectedRoute>
  ),
});
