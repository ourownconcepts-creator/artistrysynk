import { createFileRoute } from "@tanstack/react-router";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { PageTransition } from "@/components/layout/PageTransition";
import AdminCopyright from "@/pages/AdminCopyright";

export const Route = createFileRoute("/admin-copyright")({
  component: () => (
    <AdminProtectedRoute
      allowedRoles={["admin", "master_admin", "super_admin", "trust_safety_admin", "moderator"]}
    >
      <PageTransition>
        <AdminCopyright />
      </PageTransition>
    </AdminProtectedRoute>
  ),
});
