import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "./LoadingSpinner";

interface AdminProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: ('admin' | 'master_admin' | 'super_admin')[];
}

export const AdminProtectedRoute = ({ children, allowedRoles }: AdminProtectedRouteProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/admin-auth");
        return;
      }

      // Check user roles
      const { data: rolesData, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error || !rolesData) {
        navigate("/admin-auth");
        return;
      }

      const userRoles = rolesData.map(r => r.role);
      const hasPermission = userRoles.some(role => allowedRoles.includes(role as any));

      if (!hasPermission) {
        navigate("/admin-auth");
        return;
      }

      setAuthorized(true);
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/admin-auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, allowedRoles]);

  if (loading) {
    return <LoadingSpinner text="Verifying admin access..." />;
  }

  return authorized ? <>{children}</> : null;
};
