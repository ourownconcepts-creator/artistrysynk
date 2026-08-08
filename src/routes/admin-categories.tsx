import { createFileRoute } from "@tanstack/react-router";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { PageTransition } from "@/components/layout/PageTransition";
import AdminCategories from "@/pages/AdminCategories";

export const Route = createFileRoute("/admin-categories")({
  component: () => (
    <AdminProtectedRoute allowedRoles={['admin', 'master_admin', 'super_admin']}>
      <PageTransition>
        <AdminCategories />
      </PageTransition>
    </AdminProtectedRoute>
  ),
});