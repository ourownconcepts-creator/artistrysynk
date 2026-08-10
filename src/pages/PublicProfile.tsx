import { openExternalUrl } from "@/lib/nativeMedia";
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, ArrowLeft, BadgeCheck, Heart, Flag, ExternalLink } from "lucide-react";
import { PortfolioGrid } from "@/components/portfolio/PortfolioGrid";
import { toast } from "sonner";
import { FlagContentDialog } from "@/components/FlagContentDialog";
import { BlockUserButton } from "@/components/settings/BlockUserButton";
import { MuteUserButton } from "@/components/settings/MuteUserButton";
import { getRoleLabel } from "@/lib/creativeRoles";
import NotFound from "@/pages/NotFound";
import { ProfileHeaderMedia } from "@/components/profile/ProfileHeaderMedia";
import { ProfileMediaGallery } from "@/components/profile/ProfileMediaGallery";
import { ProfileQuickActions } from "@/components/profile/ProfileQuickActions";

const BASE = "https://artistrysynk.app";

interface PublicProfileRow {
  id: string;
  full_name: string;
  username: string;
  bio: string | null;
  location: string | null;
  city: string | null;
  country: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  social_links: Record<string, string> | null;
  is_verified: boolean | null;
  created_at: string;
  roles: string[] | null;
  genres: string[] | null;
  skills: string[] | null;
}

interface PublicPortfolioItem {
  id: string;
  title: string;
  description: string | null;
  media_type: string;
  media_url: string;
  thumbnail_url: string | null;
  created_at: string;
}

const PublicProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfileRow | null>(null);
  const [portfolio, setPortfolio] = useState<PublicPortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setLoading(true);
    setNotFound(false);

    (async () => {
      // Anonymous-safe read: only public, non-hidden profiles are returned.
      const { data } = await supabase.rpc("get_public_profile", { _identifier: userId });
      const row = (data as PublicProfileRow[] | null)?.[0] ?? null;
      if (!active) return;

      if (!row) {
        setProfile(null);
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(row);
      setLoading(false);

      const { data: items } = await supabase.rpc("list_public_portfolio", { _user_id: row.id, _limit: 12 });
      if (active) setPortfolio((items as PublicPortfolioItem[]) ?? []);
    })();

    return () => {
      active = false;
    };
  }, [userId]);

  const handleLike = async () => {
    if (!currentUserId) {
      toast.error("Please sign in to like profiles");
      navigate("/auth");
      return;
    }
    if (!profile || currentUserId === profile.id) {
      toast.error("You can't like your own profile");
      return;
    }

    const { error } = await supabase.from("swipes").insert({
      swiper_id: currentUserId,
      swiped_id: profile.id,
      liked: true,
    });

    if (error) {
      if (error.code === "23505") {
        toast.info("You've already swiped on this profile");
      } else {
        toast.error("Failed to like profile");
      }
      return;
    }

    toast.success(`You liked ${profile.full_name}!`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-secondary/5">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (notFound || !profile) return <NotFound />;

  const roles = profile.roles ?? [];
  const genres = profile.genres ?? [];
  const skills = profile.skills ?? [];
  const socialLinks = Object.entries(profile.social_links ?? {}).filter(([, url]) => Boolean(url));
  const profileUrl = `${BASE}/profile/${profile.username || profile.id}`;
  const roleLabels = roles.map((r) => getRoleLabel(r as never));
  const metaDescription =
    profile.bio?.slice(0, 155) ||
    `${profile.full_name}${roleLabels.length ? ` — ${roleLabels.join(", ")}` : ""}${
      profile.location ? ` based in ${profile.location}` : ""
    }. See portfolio highlights and collaborate on ArtistrySynk.`;
  const isOwner = currentUserId === profile.id;
  const featuredMedia =
    portfolio.find((p) => p.media_type === "video") ?? portfolio.find((p) => p.media_type === "audio") ?? null;

  return (
    <>
      <main className="min-h-dvh bg-background">
        <div className="mx-auto w-full max-w-3xl px-3 pb-16 sm:px-4">
          <Button variant="ghost" className="my-3" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
            Back
          </Button>

          <div className="overflow-hidden rounded-3xl border border-border bg-card sm:rounded-4xl">
            {/* Editorial cover */}
            <div className="relative h-40 w-full bg-gradient-to-br from-primary/40 via-secondary/25 to-accent/25 sm:h-56">
              {featuredMedia?.media_type === "video" ? (
                <ProfileHeaderMedia item={featuredMedia} name={profile.full_name} />
              ) : profile.cover_image_url ? (
                <img
                  src={profile.cover_image_url}
                  alt={`${profile.full_name} cover image`}
                  loading="lazy"
                  className="h-full w-full object-cover opacity-70"
                />
              ) : null}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
            </div>

            <div className="relative z-10 -mt-14 px-4 pb-8 sm:-mt-20 sm:px-6">
              {/* Asymmetric header */}
              <div className="flex items-end justify-between gap-3">
                <div className="shrink-0 overflow-hidden rounded-2xl border-2 border-secondary shadow-[4px_4px_0_0_hsl(var(--accent))]">
                  <Avatar className="h-20 w-20 rounded-none sm:h-28 sm:w-28">
                    <AvatarImage
                      src={profile.avatar_url ?? undefined}
                      alt={`${profile.full_name} profile photo`}
                      className="object-cover"
                    />
                    <AvatarFallback className="rounded-none bg-primary/20 text-3xl sm:text-4xl">
                      {profile.full_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                {profile.is_verified && (
                  <div className="flex min-w-0 flex-col items-end pb-2">
                    <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.2em] text-accent sm:text-[12px] sm:tracking-[0.3em]">
                      <BadgeCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>Verified Synk</span>
                    </span>
                    <div className="mt-1 h-1 w-8 bg-secondary" />
                  </div>
                )}
              </div>

              <div className="mt-5 sm:mt-6">
                <h1
                  className="break-words text-[clamp(2rem,9vw,3rem)] font-extrabold uppercase leading-[0.9] tracking-tighter sm:text-5xl sm:leading-[0.85]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {profile.full_name}
                </h1>
                <p className="mt-2 truncate font-mono text-sm uppercase tracking-tight text-primary">
                  @{profile.username}
                </p>
              </div>

              {featuredMedia?.media_type === "audio" && (
                <ProfileHeaderMedia item={featuredMedia} name={profile.full_name} />
              )}

              {/* Roles as editorial rail */}
              {roles.length > 0 && (
                <nav
                  aria-label="Creative roles"
                  className="mt-6 -mx-1 flex w-full max-w-full items-baseline gap-4 overflow-x-auto px-1 pb-1 sm:mt-8"
                >
                  <h2 className="sr-only">Creative roles</h2>
                  {roles.map((r, i) => (
                    <span
                      key={r}
                      className={`flex-shrink-0 pb-1 text-[11px] font-bold uppercase tracking-widest ${
                        i === 0
                          ? "border-b-2 border-secondary text-secondary"
                          : "text-foreground/70"
                      }`}
                    >
                      {getRoleLabel(r as never)}
                    </span>
                  ))}
                </nav>
              )}

              <ProfileMediaGallery items={portfolio} name={profile.full_name} />

              {/* Metadata grid */}
              <div className="mt-6 grid grid-cols-1 gap-px border border-border bg-border sm:mt-8 sm:grid-cols-2">
                <div className="min-w-0 bg-card p-4">
                  <p className="mb-1 text-[11px] uppercase tracking-widest text-muted-foreground">Genres</p>
                  <p className="break-words text-xs font-medium">
                    {genres.length ? genres.map((g) => g.replace(/_/g, " ")).join(", ") : "—"}
                  </p>
                </div>
                <div className="min-w-0 bg-card p-4">
                  <p className="mb-1 text-[11px] uppercase tracking-widest text-muted-foreground">Active in</p>
                  <p className="flex min-w-0 items-center gap-1 text-xs font-medium">
                    <MapPin className="h-3 w-3 shrink-0 text-accent" aria-hidden="true" />
                    <span className="truncate">{profile.location || "Remote"}</span>
                  </p>
                </div>
                {skills.length > 0 && (
                  <div className="min-w-0 bg-card p-4 sm:col-span-2">
                    <p className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {skills.map((s) => (
                        <Badge key={s} variant="outline" className="text-[10px] uppercase tracking-widest">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Brief */}
              {profile.bio && (
                <div className="mt-8">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-accent" />
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      Profile brief
                    </h2>
                  </div>
                  <p className="text-sm font-light leading-relaxed text-foreground/80">{profile.bio}</p>
                </div>
              )}

              {socialLinks.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2 sm:mt-8 sm:gap-3">
                  <h2 className="sr-only">Links</h2>
                  {socialLinks.map(([platform, url]) => (
                    <Button
                      key={platform}
                      variant="outline"
                      size="sm"
                      aria-label={`Open ${platform} profile of ${profile.full_name} in a new tab`}
                      className="max-w-full gap-1 rounded-xl text-[10px] font-bold uppercase tracking-widest"
                      onClick={() => {
                        const fullUrl = url.startsWith("http") ? url : `https://${url}`;
                        void openExternalUrl(fullUrl);
                      }}
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                      <span className="truncate">{platform}</span>
                    </Button>
                  ))}
                </div>
              )}

              <div className="mt-6 flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
                Joined {new Date(profile.created_at).toLocaleDateString()}
              </div>

              {currentUserId && !isOwner && (
                <div className="mt-8 space-y-3">
                  <ProfileQuickActions
                    currentUserId={currentUserId}
                    profileId={profile.id}
                    profileName={profile.full_name}
                  />
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <Button
                    onClick={handleLike}
                    aria-label={`Request collaboration with ${profile.full_name}`}
                    className="h-12 w-full min-w-0 flex-1 gap-2 rounded-xl text-[11px] font-bold uppercase tracking-widest sm:w-auto"
                  >
                    <Heart className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">Request collaboration</span>
                  </Button>
                  <FlagContentDialog
                    contentType="profile"
                    contentId={profile.id}
                    trigger={
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label={`Report ${profile.full_name}`}
                        className="min-h-11 min-w-11 text-muted-foreground hover:text-destructive"
                      >
                        <Flag className="w-5 h-5" aria-hidden="true" />
                      </Button>
                    }
                  />
                  <MuteUserButton
                    userId={currentUserId}
                    targetUserId={profile.id}
                    targetUserName={profile.full_name}
                  />
                  <BlockUserButton
                    userId={currentUserId}
                    targetUserId={profile.id}
                    targetUserName={profile.full_name}
                    onBlocked={() => navigate("/discover")}
                  />
                  </div>
                </div>
              )}

              {!currentUserId && (
                <div className="mt-8 flex flex-col gap-2">
                  <Button asChild className="h-12 rounded-xl text-[11px] font-bold uppercase tracking-widest">
                    <Link to="/auth">Join ArtistrySynk to collaborate</Link>
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Create a free account to message, match and collaborate with {profile.full_name}.
                  </p>
                </div>
              )}
            </div>

            <div className="flex h-1 w-full">
              <div className="h-full flex-1 bg-secondary" />
              <div className="h-full flex-1 bg-primary" />
              <div className="h-full flex-1 bg-accent" />
            </div>
          </div>

          <Card className="mt-6 rounded-3xl">
            <CardHeader>
              <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                Portfolio highlights
              </h2>
            </CardHeader>
            <CardContent>
              {currentUserId ? (
                <PortfolioGrid userId={profile.id} showReportButton={!isOwner} />
              ) : portfolio.length > 0 ? (
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 list-none p-0">
                  {portfolio.map((item) => (
                    <li key={item.id} className="rounded-lg border overflow-hidden">
                      {item.thumbnail_url || item.media_type === "image" ? (
                        <img
                          src={item.thumbnail_url ?? item.media_url}
                          alt={`${item.title} by ${profile.full_name}`}
                          loading="lazy"
                          className="aspect-video w-full object-cover"
                        />
                      ) : null}
                      <div className="p-3">
                        <h3 className="text-sm font-semibold">{item.title}</h3>
                        {item.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No public portfolio items yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
};

export default PublicProfile;
