import { createFileRoute } from "@tanstack/react-router";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { PageTransition } from "@/components/layout/PageTransition";
import AdminIntegrations from "@/pages/AdminIntegrations";

export const Route = createFileRoute("/admin-integrations")({
  head: () => ({
    meta: [
      { title: "Partner Connections | ArtistrySynk Admin" },
      {
        name: "description",
        content:
          "Manage connected partner contestants, review their ArtistrySynk profile and approve pending identity links.",
      },
      { property: "og:title", content: "Partner Connections | ArtistrySynk Admin" },
      {
        property: "og:description",
        content: "Admin console for partner identity links and pending connection approvals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AdminProtectedRoute allowedRoles={["admin", "master_admin", "super_admin"]}>
      <PageTransition>
        <AdminIntegrations />
      </PageTransition>
    </AdminProtectedRoute>
  ),
});
