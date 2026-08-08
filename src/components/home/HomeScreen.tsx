import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  MessageCircle,
  Handshake,
  Heart,
  MapPin,
  Briefcase,
  FolderOpen,
  Sparkles,
  ArrowRight,
  BadgeCheck,
} from "lucide-react";
import {
  Chip,
  EmptyState,
  HScroll,
  ListRow,
  PresenceAvatar,
  Pressable,
  SectionHeader,
  SkeletonList,
  SkeletonTiles,
  Surface,
} from "@/components/native-ui";
import { useAppUser } from "@/hooks/useAppUser";
import { getRoleLabel } from "@/lib/creativeRoles";
import {
  fetchHomeSnapshot,
  fetchNearby,
  fetchOpenProjects,
  fetchOpportunities,
  fetchRecentSignups,
  fetchTrendingPosts,
  greeting,
  isOnline,
} from "./homeQueries";

function completion(profile: ReturnType<typeof useAppUser>["profile"]) {
  if (!profile) return 0;
  const checks = [profile.avatar_url, profile.bio, profile.username, profile.city || profile.location];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function HomeScreen() {
  const { user, profile } = useAppUser();
  const uid = user?.id;

  const snapshot = useQuery({
    queryKey: ["home-snapshot", uid],
    queryFn: () => fetchHomeSnapshot(uid!),
    enabled: !!uid,
  });
  const nearby = useQuery({ queryKey: ["home-nearby", uid], queryFn: () => fetchNearby(uid!), enabled: !!uid });
  const posts = useQuery({ queryKey: ["home-posts"], queryFn: fetchTrendingPosts });
  const jobs = useQuery({ queryKey: ["home-jobs"], queryFn: fetchOpportunities });
  const projects = useQuery({ queryKey: ["home-projects"], queryFn: fetchOpenProjects });
  const signups = useQuery({
    queryKey: ["home-signups", uid],
    queryFn: () => fetchRecentSignups(uid!),
    enabled: !!uid,
  });

  const pct = completion(profile);
  const firstName = (profile?.full_name ?? "there").split(" ")[0];
  const onlineMatches = (snapshot.data?.matches ?? []).filter((m) => isOnline(m.last_seen_at));

  return (
    <div className="space-y-7">
      {/* Greeting */}
      <header className="pt-1">
        <p className="text-sm text-muted-foreground">{greeting()},</p>
        <h2 className="text-2xl font-black tracking-tight">{firstName} 👋</h2>
      </header>

      {/* Live counters */}
      <div className="grid grid-cols-3 gap-3">
        <CounterTile
          to="/messages"
          icon={MessageCircle}
          value={snapshot.data?.unreadMessages ?? 0}
          label="Unread"
        />
        <CounterTile
          to="/matches"
          icon={Handshake}
          value={snapshot.data?.pendingRequests ?? 0}
          label="Requests"
        />
        <CounterTile
          to="/who-liked-you"
          icon={Heart}
          value={snapshot.data?.newLikes ?? 0}
          label="Likes"
        />
      </div>

      {/* Profile completion */}
      {pct < 100 ? (
        <Surface level={1} className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Complete your profile</p>
              <p className="text-xs text-muted-foreground">
                {pct}% done — finish it to appear higher in Discover.
              </p>
            </div>
            <Link
              to="/edit-profile"
              className="shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
            >
              Continue
            </Link>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${pct}%`, backgroundImage: "var(--gradient-primary)" }}
            />
          </div>
        </Surface>
      ) : null}

      {/* Online now */}
      {onlineMatches.length ? (
        <section>
          <SectionHeader title="Online now" subtitle="Your matches currently active" />
          <HScroll>
            {onlineMatches.map((m) => (
              <Link key={m.id} to="/messages" className="w-20 shrink-0 text-center">
                <PresenceAvatar
                  src={m.avatar_url}
                  name={m.full_name ?? m.username ?? "Creative"}
                  online
                  size="lg"
                />
                <p className="mt-1.5 truncate text-[11px] font-medium">
                  {(m.full_name ?? m.username ?? "Creative").split(" ")[0]}
                </p>
              </Link>
            ))}
          </HScroll>
        </section>
      ) : null}

      {/* Nearby creatives */}
      <section>
        <SectionHeader
          title="Creatives near you"
          action={<Link to="/discover" className="text-xs font-semibold text-primary">Discover</Link>}
        />
        {nearby.isLoading ? (
          <SkeletonTiles tiles={4} />
        ) : nearby.data?.length ? (
          <HScroll>
            {nearby.data.map((p: Record<string, unknown>) => (
              <Link
                key={String(p.id)}
                to="/profile/$username"
                params={{ username: String(p.username ?? p.id) }}
                className="w-40 shrink-0"
              >
                <Surface level={1} className="h-full p-3">
                  <PresenceAvatar
                    src={(p.avatar_url as string) ?? null}
                    name={(p.full_name as string) ?? "Creative"}
                    size="lg"
                  />
                  <p className="mt-2 flex items-center gap-1 truncate text-sm font-semibold">
                    <span className="truncate">{(p.full_name as string) ?? "Creative"}</span>
                    {p.is_verified ? <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" /> : null}
                  </p>
                  <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {(p.city as string) ?? (p.location as string) ?? "Global"}
                    {typeof p.distance_km === "number" ? ` · ${Math.round(p.distance_km)}km` : ""}
                  </p>
                </Surface>
              </Link>
            ))}
          </HScroll>
        ) : (
          <EmptyState
            icon={<MapPin className="h-6 w-6" />}
            title="No one nearby yet"
            description="Add your city so we can match you with creatives around you."
            action={
              <Link
                to="/edit-profile"
                className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
              >
                Add location
              </Link>
            }
          />
        )}
      </section>

      {/* Synk AI */}
      <Link to="/synk-ai" className="block">
        <Surface level={1} className="flex items-center gap-3 p-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Ask Synk AI</p>
            <p className="truncate text-xs text-muted-foreground">
              Sharpen your profile, write captions, find collaborators.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Surface>
      </Link>

      {/* Opportunities */}
      <section>
        <SectionHeader
          title="Recommended opportunities"
          action={<Link to="/jobs" className="text-xs font-semibold text-primary">All</Link>}
        />
        {jobs.isLoading ? (
          <SkeletonList rows={3} />
        ) : jobs.data?.length ? (
          <div className="space-y-2">
            {jobs.data.map((job) => (
              <LinkRow
                key={job.id}
                to="/jobs"
                icon={Briefcase}
                title={job.title}
                subtitle={[job.location, job.job_type, job.budget_range].filter(Boolean).join(" · ")}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Briefcase className="h-6 w-6" />}
            title="No open roles right now"
            description="Post one and let the right creatives come to you."
            action={
              <Link
                to="/jobs"
                className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
              >
                Post opportunity
              </Link>
            }
          />
        )}
      </section>

      {/* Trending collaborations */}
      <section>
        <SectionHeader
          title="Trending collaborations"
          action={<Link to="/feed" className="text-xs font-semibold text-primary">Feed</Link>}
        />
        {posts.isLoading ? (
          <SkeletonList rows={3} />
        ) : posts.data?.length ? (
          <div className="space-y-3">
            {posts.data.map((post) => (
              <Link key={post.id} to="/feed" className="block">
                <Surface level={1} className="p-4">
                  <div className="flex items-center gap-2">
                    <PresenceAvatar
                      src={post.author?.avatar_url ?? null}
                      name={post.author?.full_name ?? "Creative"}
                      size="sm"
                    />
                    <p className="min-w-0 truncate text-sm font-semibold">
                      {post.author?.full_name ?? "Creative"}
                    </p>
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{post.content}</p>
                  {post.role_tags?.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {post.role_tags.slice(0, 3).map((r: string) => (
                        <Chip key={r}>{getRoleLabel(r as never) ?? r}</Chip>
                      ))}
                    </div>
                  ) : null}
                </Surface>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Handshake className="h-6 w-6" />}
            title="No collab posts yet"
            description="Share what you are building and find your crew."
            action={
              <Link
                to="/feed"
                className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
              >
                Open feed
              </Link>
            }
          />
        )}
      </section>

      {/* Open projects */}
      <section>
        <SectionHeader
          title="Open projects"
          action={<Link to="/open-projects" className="text-xs font-semibold text-primary">All</Link>}
        />
        {projects.isLoading ? (
          <SkeletonList rows={3} />
        ) : projects.data?.length ? (
          <div className="space-y-2">
            {projects.data.map((p) => (
              <LinkRow
                key={p.id}
                to="/open-projects"
                icon={FolderOpen}
                title={p.title}
                subtitle={[p.project_category, p.budget].filter(Boolean).join(" · ") || undefined}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<FolderOpen className="h-6 w-6" />}
            title="No open projects"
            description="Start one and invite collaborators into a project room."
            action={
              <Link
                to="/projects"
                className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
              >
                Create project
              </Link>
            }
          />
        )}
      </section>

      {/* Latest activity */}
      <section className="pb-2">
        <SectionHeader title="New on ArtistrySynk" subtitle="Latest creatives joining" />
        {signups.isLoading ? (
          <SkeletonTiles tiles={4} />
        ) : (
          <HScroll>
            {(signups.data ?? []).map((p) => (
              <Link
                key={p.id}
                to="/profile/$username"
                params={{ username: p.username ?? p.id }}
                className="w-20 shrink-0 text-center"
              >
                <PresenceAvatar src={p.avatar_url} name={p.full_name ?? "Creative"} size="lg" />
                <p className="mt-1.5 truncate text-[11px] font-medium">
                  {(p.full_name ?? "Creative").split(" ")[0]}
                </p>
              </Link>
            ))}
          </HScroll>
        )}
      </section>
    </div>
  );
}

function CounterTile({
  to,
  icon: Icon,
  value,
  label,
}: {
  to: string;
  icon: typeof Heart;
  value: number;
  label: string;
}) {
  return (
    <Link to={to} className="block">
      <Pressable lift className="w-full rounded-3xl bg-surface-1 p-3 text-left shadow-app-sm">
        <Icon className="h-4 w-4 text-primary" />
        <p className="mt-2 text-xl font-black tabular-nums leading-none">{value}</p>
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </Pressable>
    </Link>
  );
}
function LinkRow({
  to,
  icon: Icon,
  title,
  subtitle,
}: {
  to: string;
  icon: typeof Heart;
  title: string;
  subtitle?: string;
}) {
  return (
    <Link to={to} className="block">
      <ListRow
        chevron
        title={title}
        subtitle={subtitle}
        leading={
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-[18px] w-[18px]" />
          </span>
        }
      />
    </Link>
  );
}
