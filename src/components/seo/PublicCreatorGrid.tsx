import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BadgeCheck, MapPin } from "lucide-react";
import { getRoleLabel } from "@/lib/creativeRoles";

export interface PublicCreator {
  id: string;
  full_name: string;
  username: string;
  bio: string | null;
  location: string | null;
  city: string | null;
  country: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  roles: string[] | null;
}

interface PublicCreatorGridProps {
  creators: PublicCreator[];
  loading?: boolean;
  emptyMessage?: string;
}

export const PublicCreatorGrid = ({ creators, loading, emptyMessage }: PublicCreatorGridProps) => {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-32 p-6" />
          </Card>
        ))}
      </div>
    );
  }

  if (creators.length === 0) {
    return (
      <p className="text-muted-foreground">
        {emptyMessage ?? "No public profiles here yet — check back soon."}
      </p>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 list-none p-0">
      {creators.map((creator) => (
        <li key={creator.id}>
          <Card className="h-full transition-colors hover:border-primary/50">
            <CardContent className="p-5">
              <Link
                to={`/profile/${creator.username ?? creator.id}`}
                className="flex items-start gap-3 no-underline"
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={creator.avatar_url ?? undefined} alt={`${creator.full_name} profile photo`} />
                  <AvatarFallback>{creator.full_name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h3 className="flex items-center gap-1 text-base font-semibold truncate">
                    {creator.full_name}
                    {creator.is_verified && <BadgeCheck className="h-4 w-4 text-emerald-500" aria-label="Verified" />}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">@{creator.username}</p>
                  {(creator.city || creator.location) && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {creator.city ?? creator.location}
                    </p>
                  )}
                </div>
              </Link>
              {creator.bio && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{creator.bio}</p>}
              {creator.roles && creator.roles.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {creator.roles.slice(0, 3).map((role) => (
                    <Badge key={role} variant="secondary" className="text-xs">
                      {getRoleLabel(role as never)}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
};
