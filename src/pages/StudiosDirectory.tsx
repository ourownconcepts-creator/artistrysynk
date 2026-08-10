import { useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/router-compat";
import { BadgeCheck, Building2, MapPin, Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PageSEO, CollectionPageSchema } from "@/components/seo";
import { useAppUser } from "@/hooks/useAppUser";
import {
  fetchMyStudioInvites,
  fetchMyStudios,
  fetchPublicStudios,
  respondToStudioInvite,
  STUDIO_ORG_TYPES,
  STUDIO_ROLE_LABELS,
  type MyStudio,
  type StudioCard,
  type StudioInvite,
} from "@/lib/studios";

const BASE = "https://artistrysynk.app";
const PAGE_SIZE = 24;

const StudiosDirectory = () => {
  const { user } = useAppUser();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [orgType, setOrgType] = useState("all");
  const [city, setCity] = useState("");
  const [studios, setStudios] = useState<StudioCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [done, setDone] = useState(false);
  const [mine, setMine] = useState<MyStudio[]>([]);
  const [invites, setInvites] = useState<StudioInvite[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setDone(false);
    fetchPublicStudios({ search: debounced, orgType, city, limit: PAGE_SIZE, offset: 0 }).then((rows) => {
      if (!active) return;
      setStudios(rows);
      setDone(rows.length < PAGE_SIZE);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [debounced, orgType, city]);

  useEffect(() => {
    if (!user) {
      setMine([]);
      setInvites([]);
      return;
    }
    void fetchMyStudios(user.id).then(setMine);
    void fetchMyStudioInvites(user.id).then(setInvites);
  }, [user]);

  const loadMore = async () => {
    setLoadingMore(true);
    const rows = await fetchPublicStudios({
      search: debounced,
      orgType,
      city,
      limit: PAGE_SIZE,
      offset: studios.length,
    });
    setStudios((prev) => [...prev, ...rows]);
    setDone(rows.length < PAGE_SIZE);
    setLoadingMore(false);
  };

  const respond = async (invite: StudioInvite, accept: boolean) => {
    try {
      await respondToStudioInvite(invite.id, accept);
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
      if (accept && user) {
        setMine(await fetchMyStudios(user.id));
        toast.success(`You joined ${invite.studios?.name ?? "the studio"}`);
      } else {
        toast.success("Invitation declined");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the invitation");
    }
  };

  const schemaItems = useMemo(
    () => studios.slice(0, 20).map((s) => ({ name: s.name, url: `${BASE}/studios/${s.handle}` })),
    [studios],
  );

  return (
    <div className="min-h-screen">
      <PageSEO
        title="Creative Studios, Agencies & Labels — ArtistrySynk"
        description="Browse verified recording studios, creative agencies, labels and production companies on ArtistrySynk. See their team, gear and work, then book a session."
        keywords="recording studios, creative agencies, music labels, production companies, studio directory"
        canonicalUrl={`${BASE}/studios`}
        breadcrumbs={[
          { name: "Home", url: `${BASE}/` },
          { name: "Studios", url: `${BASE}/studios` },
        ]}
      />
      <CollectionPageSchema
        name="Creative studios on ArtistrySynk"
        description="Directory of studios, agencies, labels and production companies."
        url={`${BASE}/studios`}
        items={schemaItems}
      />

      <main className="container mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Studios &amp; creative houses</h1>
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
              Recording studios, agencies, labels and production companies — with their real team, gear and work.
            </p>
          </div>
          <Button asChild size="lg">
            <Link to="/studios/new">
              <Plus className="mr-2 h-4 w-4" />
              Create a studio
            </Link>
          </Button>
        </div>

        {invites.length > 0 && (
          <section className="mt-10" aria-labelledby="studio-invites">
            <h2 id="studio-invites" className="mb-3 text-xl font-semibold">
              Your invitations
            </h2>
            <div className="space-y-3">
              {invites.map((invite) => (
                <Card key={invite.id}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={invite.studios?.logo_url ?? undefined} alt="" />
                        <AvatarFallback>{invite.studios?.name?.charAt(0) ?? "S"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{invite.studios?.name ?? "A studio"}</p>
                        <p className="text-sm text-muted-foreground">
                          Invited you as {STUDIO_ROLE_LABELS[invite.role]}
                          {invite.title ? ` · ${invite.title}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => respond(invite, true)}>
                        Accept
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => respond(invite, false)}>
                        Decline
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {mine.length > 0 && (
          <section className="mt-10" aria-labelledby="my-studios">
            <h2 id="my-studios" className="mb-3 text-xl font-semibold">
              Your studios
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {mine.map(({ studio, role }) => (
                <Card key={studio.id}>
                  <CardContent className="flex items-center justify-between gap-3 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={studio.logo_url ?? undefined} alt="" />
                        <AvatarFallback>{studio.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{studio.name}</p>
                        <p className="text-xs text-muted-foreground">{STUDIO_ROLE_LABELS[role]}</p>
                      </div>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/studios/${studio.handle}/manage`}>Manage</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        <section className="mt-12" aria-labelledby="browse-studios">
          <h2 id="browse-studios" className="sr-only">
            Browse studios
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search studios by name or handle"
                className="pl-9"
                aria-label="Search studios"
              />
            </div>
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              className="sm:w-44"
              aria-label="Filter by city"
            />
            <Select value={orgType} onValueChange={setOrgType}>
              <SelectTrigger className="sm:w-52" aria-label="Filter by type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {STUDIO_ORG_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-52 w-full rounded-xl" />
              ))}
            </div>
          ) : studios.length === 0 ? (
            <Card className="mt-6">
              <CardContent className="py-12 text-center">
                <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="font-medium">No studios match that yet</p>
                <p className="text-sm text-muted-foreground">Try a different city, type or search term.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {studios.map((studio) => (
                  <Link
                    key={studio.id}
                    to={`/studios/${studio.handle}`}
                    className="group overflow-hidden rounded-xl border transition-colors hover:border-primary/50"
                  >
                    <div className="h-24 bg-gradient-to-br from-primary/25 via-secondary/20 to-accent/20">
                      {studio.cover_url && (
                        <img
                          src={studio.cover_url}
                          alt=""
                          loading="lazy"
                          className="h-24 w-full object-cover transition-transform group-hover:scale-[1.03]"
                        />
                      )}
                    </div>
                    <div className="p-4">
                      <div className="-mt-9 mb-2 flex items-end justify-between">
                        <Avatar className="h-12 w-12 border-2 border-background">
                          <AvatarImage src={studio.logo_url ?? undefined} alt="" />
                          <AvatarFallback>{studio.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <Badge variant="secondary" className="capitalize">
                          {studio.org_type.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="flex items-center gap-1.5 font-semibold">
                        <span className="truncate">{studio.name}</span>
                        {studio.is_verified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />}
                      </p>
                      {studio.tagline && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{studio.tagline}</p>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {(studio.primary_city || studio.primary_country) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {[studio.primary_city, studio.primary_country].filter(Boolean).join(", ")}
                          </span>
                        )}
                        {studio.facilities?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {studio.facilities.length} facilities
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              {!done && (
                <div className="mt-8 text-center">
                  <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? "Loading…" : "Load more studios"}
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default StudiosDirectory;