import { createFileRoute } from "@tanstack/react-router";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { PageTransition } from "@/components/layout/PageTransition";
import AdminIdentity from "@/pages/AdminIdentity";

export const Route = createFileRoute("/admin-identity")({
  head: () => ({
    meta: [
      { title: "Identity & Verification | ArtistrySynk Admin" },
      {
        name: "description",
        content:
          "Admin console for verification requests and the identity access audit log, without exposing legal identity data.",
      },
      { property: "og:title", content: "Identity & Verification | ArtistrySynk Admin" },
      {
        property: "og:description",
        content: "Review verification requests and audit legal identity access on ArtistrySynk.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AdminProtectedRoute allowedRoles={["compliance_admin", "master_admin", "super_admin"]}>
      <PageTransition>
        <AdminIdentity />
      </PageTransition>
    </AdminProtectedRoute>
  ),
});