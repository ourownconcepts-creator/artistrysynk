/**
 * Studio entry points on the profile surface. Membership comes from the
 * signed-in user's own token via useMyStudios, so studio RLS decides what is
 * listed here — nothing on this screen is an authorization decision.
 */
import { Link } from "@/lib/router-compat";
import { BadgeCheck, Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SectionHeader, Surface } from "@/components/native-ui";
import { useMyStudios } from "@/hooks/useMyStudios";
import { STUDIO_ROLE_LABELS } from "@/lib/studios";

const MANAGING_ROLES = ["owner", "admin", "manager"];

export function StudioQuickLinks() {
  const { studios, isLoading } = useMyStudios();

  if (isLoading) return null;

  return (
    <Surface inset className="space-y-3">
      <SectionHeader
        title="Studios"
        className="px-0"
        subtitle={studios.length ? `${studios.length} membership${studios.length > 1 ? "s" : ""}` : "Browse studios, labels and agencies"}
        action={
          <Button asChild size="sm" variant="ghost">
            <Link to="/studios">Browse</Link>
          </Button>
        }
      />

      {studios.length === 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Join a studio, label or agency — or create your own to publish services and take bookings.
          </p>
          <Button asChild variant="outline" className="w-full rounded-full">
            <Link to="/studios/new">
              <Plus className="mr-2 h-4 w-4" />
              Create a studio
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {studios.map(({ studio, role }) => (
            <li key={studio.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={studio.logo_url ?? undefined} alt="" />
                <AvatarFallback>
                  <Building2 className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <Link
                  to={`/studios/${studio.handle}`}
                  className="flex items-center gap-1 truncate text-sm font-medium hover:underline"
                >
                  <span className="truncate">{studio.name}</span>
                  {studio.is_verified ? <BadgeCheck className="h-4 w-4 shrink-0 text-primary" /> : null}
                </Link>
                <p className="truncate text-xs text-muted-foreground">{STUDIO_ROLE_LABELS[role]}</p>
              </div>
              {MANAGING_ROLES.includes(role) ? (
                <Button asChild size="sm" variant="outline">
                  <Link to={`/studios/${studio.handle}/manage`}>Manage</Link>
                </Button>
              ) : (
                <Button asChild size="sm" variant="ghost">
                  <Link to={`/studios/${studio.handle}`}>View</Link>
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Surface>
  );
}
