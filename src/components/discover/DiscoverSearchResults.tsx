import { useEffect, useRef } from "react";
import { Loader2, MapPin, Search, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Pressable, SkeletonTiles, Surface } from "@/components/native-ui";
import { getRoleLabel } from "@/lib/creativeRoles";
import { TrustSignals, VerifiedBadge } from "@/components/trust/TrustSignals";

export type SearchProfile = {
  id: string;
  full_name: string;
  username: string;
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
  is_verified?: boolean | null;
  is_featured?: boolean | null;
  last_seen_at?: string | null;
  user_creative_roles?: { role: string }[];
};

const isOnline = (lastSeen?: string | null) =>
  !!lastSeen && Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000;

/** Live-updating result grid for instant Discover search, with infinite scroll. */
export function DiscoverSearchResults({
  results,
  loading,
  query,
  onOpen,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  results: SearchProfile[];
  loading: boolean;
  query: string;
  onOpen: (id: string) => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || !onLoadMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { rootMargin: "300px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore, results.length]);

  if (loading) return <SkeletonTiles />;

  if (results.length === 0) {
    return (
      <EmptyState
        icon={<Search className="h-6 w-6" />}
        title={query ? `No creatives match “${query}”` : "No creatives match these filters"}
        description="Try a different name, role, skill or city — results update as you type."
      />
    );
  }

  return (
    <>
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {results.map((p) => (
        <li key={p.id}>
          <Pressable onClick={() => onOpen(p.id)} lift className="w-full text-left" aria-label={`Open ${p.full_name}`}>
            <Surface inset className="h-full space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={p.avatar_url ?? undefined} alt={p.full_name} />
                    <AvatarFallback>
                      {p.full_name?.charAt(0) ?? <UserRound className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  {isOnline(p.last_seen_at) ? (
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface-1 bg-emerald-500" />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-1 truncate text-sm font-semibold">
                    <span className="truncate">{p.full_name}</span>
                    {p.is_verified ? <VerifiedBadge className="h-3.5 w-3.5" /> : null}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">@{p.username}</p>
                </div>
              </div>
              <TrustSignals
                isVerified={p.is_verified}
                isFeatured={p.is_featured}
                lastSeenAt={p.last_seen_at}
              />
              {p.location ? (
                <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{p.location}</span>
                </p>
              ) : null}
              <div className="flex flex-wrap gap-1">
                {(p.user_creative_roles ?? []).slice(0, 2).map((r, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px]">
                    {getRoleLabel(r.role as never)}
                  </Badge>
                ))}
              </div>
            </Surface>
          </Pressable>
        </li>
      ))}
    </ul>
      <div ref={sentinelRef} className="h-6" />
      {loadingMore ? (
        <p className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading more creatives…
        </p>
      ) : !hasMore ? (
        <p className="py-2 text-center text-xs text-muted-foreground">You've reached the end of the results</p>
      ) : null}
    </>
  );
}