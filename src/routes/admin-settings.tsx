import { createFileRoute } from "@tanstack/react-router";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { PageTransition } from "@/components/layout/PageTransition";
import AdminSettings from "@/pages/AdminSettings";

export const Route = createFileRoute("/admin-settings")({
  component: () => (
    <AdminProtectedRoute allowedRoles={['super_admin']}>
      <PageTransition>
        <AdminSettings />
      </PageTransition>
    </AdminProtectedRoute>
  ),
});