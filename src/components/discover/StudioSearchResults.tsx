import { useEffect, useState } from "react";
import { BadgeCheck, Building2, MapPin } from "lucide-react";
import { Pressable, SectionHeader } from "@/components/native-ui";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { fetchPublicStudios, type StudioCard } from "@/lib/studios";

/** Studios matching the Discover search term, shown above creative results. */
export function StudioSearchResults({ query, onOpen }: { query: string; onOpen: (handle: string) => void }) {
  const [studios, setStudios] = useState<StudioCard[]>([]);

  useEffect(() => {
    if (!query) {
      setStudios([]);
      return;
    }
    let active = true;
    fetchPublicStudios({ search: query, limit: 8 }).then((rows) => {
      if (active) setStudios(rows);
    });
    return () => {
      active = false;
    };
  }, [query]);

  if (studios.length === 0) return null;

  return (
    <section aria-label="Studios">
      <SectionHeader title="Studios" subtitle={`${studios.length} matching`} />
      <div className="app-scroll -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {studios.map((studio) => (
          <Pressable
            key={studio.id}
            onClick={() => onOpen(studio.handle)}
            className="w-52 shrink-0 rounded-2xl bg-surface-2 p-3 text-left"
          >
            <div className="flex items-center gap-2">
              <Avatar className="h-9 w-9">
                <AvatarImage src={studio.logo_url ?? undefined} alt="" />
                <AvatarFallback>
                  <Building2 className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="flex items-center gap-1 truncate text-sm font-semibold">
                  <span className="truncate">{studio.name}</span>
                  {studio.is_verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" />}
                </p>
                <p className="truncate text-[11px] capitalize text-muted-foreground">
                  {studio.org_type.replace(/_/g, " ")}
                </p>
              </div>
            </div>
            {studio.tagline && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{studio.tagline}</p>}
            {(studio.primary_city || studio.primary_country) && (
              <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {[studio.primary_city, studio.primary_country].filter(Boolean).join(", ")}
              </p>
            )}
          </Pressable>
        ))}
      </div>
    </section>
  );
}