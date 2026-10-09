import { useQuery } from "@tanstack/react-query";
import { useAppUser } from "@/hooks/useAppUser";
import { supabase } from "@/integrations/supabase/client";

/** Shared auth-session state expected by route-level admin and judging workspaces. */
export function useSession() {
  const { user, loading } = useAppUser();
  return { user, ready: !loading };
}

/** Current account roles, normalized for the legacy route guards that consume them. */
export function useMyRoles() {
  const { user, ready } = useSession();

  return useQuery({
    queryKey: ["my-roles", user?.id],
    enabled: ready && Boolean(user?.id),
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data ?? []).map((row) => String(row.role).toUpperCase());
    },
  });
}
