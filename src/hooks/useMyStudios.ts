/**
 * Studio entry points for the existing navigation surfaces. Membership is read
 * with the signed-in user's own token, so the studio RLS policies decide what
 * comes back — nothing here is an authorization decision.
 */
import { useQuery } from "@tanstack/react-query";
import { useAppUser } from "@/hooks/useAppUser";
import { fetchMyStudios, type MyStudio } from "@/lib/studios";

const MANAGING_ROLES: MyStudio["role"][] = ["owner", "admin", "manager"];

export function useMyStudios() {
  const { user } = useAppUser();

  const { data = [], isLoading } = useQuery({
    queryKey: ["my-studios", user?.id],
    queryFn: () => fetchMyStudios(user!.id),
    enabled: !!user,
    staleTime: 60_000,
  });

  const primary = data.find((row) => MANAGING_ROLES.includes(row.role)) ?? data[0] ?? null;

  return {
    studios: data,
    /** First studio the user can manage, otherwise their first membership. */
    primary,
    /** True when the primary studio exposes management to this member. */
    canManagePrimary: !!primary && MANAGING_ROLES.includes(primary.role),
    hasStudio: data.length > 0,
    isLoading,
  };
}
