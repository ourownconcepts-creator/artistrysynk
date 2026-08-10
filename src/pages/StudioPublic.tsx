import { useEffect, useState } from "react";
import { Link, useParams } from "@/lib/router-compat";
import { BadgeCheck, Building2, Heart, Mail, MapPin, Music2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Footer } from "@/components/Footer";
import { useAppUser } from "@/hooks/useAppUser";
import {
  fetchPublicStudio,
  fetchStudioEquipment,
  fetchStudioPortfolio,
  fetchStudioTeam,
  isFollowingStudio,
  toggleStudioFollow,
  type PublicStudio,
  type StudioEquipment,
  type StudioPortfolioItem,
  type StudioTeamMember,
} from "@/lib/studios";

const StudioPublic = () => {
  const { handle = "" } = useParams<{ handle: string }>();
  const { user } = useAppUser();
  const [studio, setStudio] = useState<PublicStudio | null>(null);
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<StudioTeamMember[]>([]);
  const [equipment, setEquipment] = useState<StudioEquipment[]>([]);
  const [gearDone, setGearDone] = useState(false);
  const [gearLoadingMore, setGearLoadingMore] = useState(false);
  const [work, setWork] = useState<StudioPortfolioItem[]>([]);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchPublicStudio(handle).then(async (row) => {
      if (!active) return;
      setStudio(row);
      setLoading(false);
      if (!row) return;
      const [t, e, w] = await Promise.all([
        fetchStudioTeam(row.id),
        fetchStudioEquipment(row.id),
        fetchStudioPortfolio(row.id),
      ]);
      if (!active) return;
      setTeam(t);
      setEquipment(e);
      setGearDone(e.length < EQUIPMENT_PAGE_SIZE);
      setWork(w);
    });
    return () => {
      active = false;
    };
  }, [handle]);

  useEffect(() => {
    if (!studio || !user) return;
    void isFollowingStudio(studio.id, user.id).then(setFollowing);
  }, [studio, user]);

  const onFollow = async () => {
    if (!studio) return;
    if (!user) {
      toast.info("Sign in to follow studios");
      return;
    }
    try {
      setFollowing(await toggleStudioFollow(studio.id, user.id, following));
    } catch {
      toast.error("Could not update follow");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-10 space-y-4">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!studio) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-24 text-center">
        <Building2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Studio not found</h1>
        <p className="mt-2 text-muted-foreground">
          This studio may be private, inactive, or the handle has changed.
        </p>
        <Button asChild className="mt-6">
          <Link to="/studios">Browse studios</Link>
        </Button>
      </div>
    );
  }

  const location = [studio.primary_city, studio.primary_country].filter(Boolean).join(", ");
  const socials = Object.entries(studio.social_links ?? {}).filter(([, v]) => typeof v === "string" && v);

  return (
    <div className="min-h-screen">
      <header className="relative">
        <div className="h-44 bg-gradient-to-br from-primary/30 via-secondary/25 to-accent/20 sm:h-60">
          {studio.cover_url && (
            <img src={studio.cover_url} alt={`${studio.name} cover`} className="h-full w-full object-cover" />
          )}
        </div>
        <div className="container mx-auto max-w-5xl px-4">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <Avatar className="h-24 w-24 border-4 border-background">
                <AvatarImage src={studio.logo_url ?? undefined} alt={`${studio.name} logo`} />
                <AvatarFallback className="text-2xl">{studio.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="pb-1">
                <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
                  {studio.name}
                  {studio.is_verified && <BadgeCheck className="h-6 w-6 text-primary" aria-label="Verified studio" />}
                </h1>
                <p className="text-sm text-muted-foreground">
                  @{studio.handle} · <span className="capitalize">{studio.org_type.replace(/_/g, " ")}</span>
                </p>
              </div>
            </div>
            <div className="flex gap-2 pb-1">
              <Button variant={following ? "secondary" : "default"} onClick={onFollow}>
                <Heart className={`mr-2 h-4 w-4 ${following ? "fill-current" : ""}`} />
                {following ? "Following" : "Follow"}
              </Button>
              {studio.contact_email && (
                <Button variant="outline" asChild>
                  <a href={`mailto:${studio.contact_email}`}>
                    <Mail className="mr-2 h-4 w-4" />
                    Contact
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {location}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            {studio.member_count} {studio.member_count === 1 ? "member" : "members"}
          </span>
          {equipment.length > 0 && (
            <span className="flex items-center gap-1.5">
              <Music2 className="h-4 w-4" />
              {equipment.length} pieces of gear
            </span>
          )}
        </div>

        {studio.tagline && <p className="mt-4 text-lg">{studio.tagline}</p>}

        <Tabs defaultValue="about" className="mt-8">
          <TabsList>
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="gear">Gear</TabsTrigger>
            <TabsTrigger value="work">Work</TabsTrigger>
          </TabsList>

          <TabsContent value="about" className="mt-6 space-y-6">
            <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
              {studio.bio || "This studio hasn't written an about section yet."}
            </p>
            {studio.facilities?.length > 0 && (
              <div>
                <h2 className="mb-2 text-lg font-semibold">Facilities</h2>
                <div className="flex flex-wrap gap-2">
                  {studio.facilities.map((f) => (
                    <Badge key={f} variant="secondary">
                      {f}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {socials.length > 0 && (
              <div>
                <h2 className="mb-2 text-lg font-semibold">Links</h2>
                <ul className="flex flex-wrap gap-4 p-0 text-sm list-none">
                  {socials.map(([key, value]) => (
                    <li key={key}>
                      <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="capitalize text-primary hover:underline"
                      >
                        {key}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>

          <TabsContent value="team" className="mt-6">
            {team.length === 0 ? (
              <p className="text-muted-foreground">No public team members yet.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {team.map((member) => (
                  <Link
                    key={member.user_id}
                    to={`/profile/${member.username || member.user_id}`}
                    className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:border-primary/50"
                  >
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={member.avatar_url ?? undefined} alt="" />
                      <AvatarFallback>{member.full_name?.charAt(0) ?? "?"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1 truncate font-medium">
                        {member.full_name ?? member.username}
                        {member.is_verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" />}
                      </p>
                      <p className="truncate text-xs capitalize text-muted-foreground">
                        {member.title || member.role.replace(/_/g, " ")}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="gear" className="mt-6">
            {equipment.length === 0 ? (
              <p className="text-muted-foreground">This studio hasn't listed its gear yet.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {equipment.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium">{item.name}</p>
                        {item.quantity > 1 && <Badge variant="outline">×{item.quantity}</Badge>}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {[item.brand, item.model].filter(Boolean).join(" ") || item.category}
                      </p>
                      {item.description && (
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
                      )}
                      {!item.is_available && (
                        <Badge variant="secondary" className="mt-3">
                          Unavailable
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="work" className="mt-6">
            {work.length === 0 ? (
              <p className="text-muted-foreground">No published work yet.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {work.map((item) => (
                  <Card key={item.id} className="overflow-hidden">
                    {item.media_type === "image" ? (
                      <img
                        src={item.thumbnail_url || item.media_url}
                        alt={item.title}
                        loading="lazy"
                        className="aspect-video w-full object-cover"
                      />
                    ) : item.media_type === "video" ? (
                      <video src={item.media_url} controls preload="none" className="aspect-video w-full bg-muted" />
                    ) : (
                      <div className="p-4">
                        <audio src={item.media_url} controls preload="none" className="w-full" />
                      </div>
                    )}
                    <CardContent className="py-3">
                      <p className="font-medium">{item.title}</p>
                      {item.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default StudioPublic;