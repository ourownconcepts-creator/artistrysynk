import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "./LoadingSpinner";
import { Session, User } from "@supabase/supabase-js";

interface AdminProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: ('admin' | 'master_admin' | 'super_admin')[];
}

export const AdminProtectedRoute = ({ children, allowedRoles }: AdminProtectedRouteProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (!currentSession) {
        navigate("/admin-auth");
      }
    });

    // THEN check for existing session and verify roles
    const checkAuth = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession) {
        navigate("/admin-auth");
        return;
      }

      setSession(currentSession);
      setUser(currentSession.user);

      // Check user roles
      const { data: rolesData, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", currentSession.user.id);

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

    return () => subscription.unsubscribe();
  }, [navigate, allowedRoles]);

  if (loading) {
    return <LoadingSpinner text="Verifying admin access..." />;
  }

  return authorized ? <>{children}</> : null;
};
