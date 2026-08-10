import { useEffect, useState } from "react";
import { Link } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, MapPin, BadgeCheck } from "lucide-react";

type PeekProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  bio: string | null;
  city: string | null;
  country: string | null;
  location: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  roles: string[] | null;
};

type PeekItem = {
  id: string;
  title: string | null;
  media_type: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
};

/** In-chat quick look at the other creative's profile + portfolio, no navigation away. */
export function ProfilePeekSheet({
  userId,
  open,
  onOpenChange,
}: {
  userId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [profile, setProfile] = useState<PeekProfile | null>(null);
  const [items, setItems] = useState<PeekItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;
    let active = true;
    setLoading(true);
    void (async () => {
      const [{ data: prof }, { data: portfolio }] = await Promise.all([
        supabase.rpc("get_public_profile", { _identifier: userId }),
        supabase.rpc("list_public_portfolio", { _user_id: userId, _limit: 6 }),
      ]);
      if (!active) return;
      setProfile(((prof as PeekProfile[] | null) ?? [])[0] ?? null);
      setItems(((portfolio as PeekItem[] | null) ?? []).slice(0, 6));
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [open, userId]);

  const place = profile?.city
    ? [profile.city, profile.country].filter(Boolean).join(", ")
    : profile?.location;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Quick profile</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : profile ? (
          <div className="space-y-5 py-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.full_name ?? "Profile"} />
                <AvatarFallback>{profile.full_name?.charAt(0) ?? "?"}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="flex items-center gap-1 font-semibold">
                  <span className="truncate">{profile.full_name ?? "Creative"}</span>
                  {profile.is_verified ? <BadgeCheck className="h-4 w-4 shrink-0 text-primary" /> : null}
                </p>
                {profile.username ? (
                  <p className="truncate text-sm text-muted-foreground">@{profile.username}</p>
                ) : null}
                {place ? (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {place}
                  </p>
                ) : null}
              </div>
            </div>

            {profile.roles?.length ? (
              <div className="flex flex-wrap gap-1.5">
                {profile.roles.slice(0, 8).map((r) => (
                  <Badge key={r} variant="secondary" className="capitalize">
                    {r.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            ) : null}

            {profile.bio ? <p className="text-sm text-muted-foreground">{profile.bio}</p> : null}

            {items.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Portfolio</p>
                <div className="grid grid-cols-3 gap-2">
                  {items.map((item) => (
                    <div key={item.id} className="aspect-square overflow-hidden rounded-lg bg-muted">
                      {item.thumbnail_url || (item.media_type === "image" && item.media_url) ? (
                        <img
                          src={item.thumbnail_url ?? item.media_url ?? ""}
                          alt={item.title ?? "Portfolio item"}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center px-1 text-center text-[10px] text-muted-foreground">
                          {item.title ?? item.media_type ?? "Media"}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex gap-2">
              <Button asChild variant="hero" className="flex-1">
                <Link to={`/profile/${profile.username ?? profile.id}`}>
                  Full profile <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Back to chat
              </Button>
            </div>
          </div>
        ) : (
          <p className="py-6 text-sm text-muted-foreground">Profile unavailable.</p>
        )}
      </SheetContent>
    </Sheet>
  );
}
