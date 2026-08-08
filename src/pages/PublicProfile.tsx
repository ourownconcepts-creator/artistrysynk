import { openExternalUrl } from "@/lib/nativeMedia";
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, ArrowLeft, BadgeCheck, Heart, Flag, ExternalLink } from "lucide-react";
import { PortfolioGrid } from "@/components/portfolio/PortfolioGrid";
import { toast } from "sonner";
import { ProfileSchema, PageSEO } from "@/components/seo";
import { FlagContentDialog } from "@/components/FlagContentDialog";
import { BlockUserButton } from "@/components/settings/BlockUserButton";
import { MuteUserButton } from "@/components/settings/MuteUserButton";
import { getRoleLabel } from "@/lib/creativeRoles";
import NotFound from "@/pages/NotFound";

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

  return (
    <>
      <PageSEO
        title={`${profile.full_name} (@${profile.username})${roleLabels.length ? ` — ${roleLabels[0]}` : ""}`}
        description={metaDescription}
        keywords={[profile.full_name, profile.username, ...roleLabels, ...skills, profile.city ?? "", "ArtistrySynk"]
          .filter(Boolean)
          .join(", ")}
        ogImage={profile.avatar_url || `${BASE}/og-image.jpg`}
        ogType="profile"
        canonicalUrl={profileUrl}
        breadcrumbs={[
          { name: "Home", url: `${BASE}/` },
          { name: profile.full_name, url: profileUrl },
        ]}
      />
      <ProfileSchema
        name={profile.full_name}
        username={profile.username}
        description={profile.bio ?? undefined}
        image={profile.avatar_url ?? undefined}
        url={profileUrl}
        jobTitles={roleLabels}
        location={profile.location ?? undefined}
        sameAs={socialLinks.map(([, url]) => (url.startsWith("http") ? url : `https://${url}`))}
      />
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-4">
        <div className="max-w-4xl mx-auto py-8">
          <Button variant="ghost" className="mb-4" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <Card className="mb-6">
            {profile.cover_image_url && (
              <div className="h-48 w-full overflow-hidden rounded-t-lg">
                <img
                  src={profile.cover_image_url}
                  alt={`${profile.full_name} cover image`}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <CardHeader className="text-center relative">
              <div className={`flex justify-center ${profile.cover_image_url ? "-mt-16" : ""}`}>
                <Avatar className="w-32 h-32 border-4 border-background shadow-lg">
                  <AvatarImage src={profile.avatar_url ?? undefined} alt={`${profile.full_name} profile photo`} />
                  <AvatarFallback className="text-4xl bg-secondary/20">{profile.full_name?.charAt(0)}</AvatarFallback>
                </Avatar>
              </div>
              <div className="flex items-center justify-center gap-2 mt-4">
                <h1 className="text-3xl font-bold leading-none tracking-tight">{profile.full_name}</h1>
                {profile.is_verified && <BadgeCheck className="w-6 h-6 text-emerald-500" aria-label="Verified" />}
              </div>
              <p className="text-muted-foreground text-lg">@{profile.username}</p>
            </CardHeader>

            <CardContent className="space-y-6">
              {profile.location && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  {profile.location}
                </div>
              )}

              {roles.length > 0 && (
                <div className="text-center">
                  <h2 className="font-semibold mb-3">Creative Roles</h2>
                  <div className="flex flex-wrap justify-center gap-2">
                    {roles.map((r) => (
                      <Badge key={r} variant="secondary" className="text-sm px-3 py-1">
                        {getRoleLabel(r as never)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {skills.length > 0 && (
                <div className="text-center">
                  <h2 className="font-semibold mb-3">Skills</h2>
                  <div className="flex flex-wrap justify-center gap-2">
                    {skills.map((s) => (
                      <Badge key={s} variant="outline" className="text-sm px-3 py-1">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {genres.length > 0 && (
                <div className="text-center">
                  <h2 className="font-semibold mb-3">Genres</h2>
                  <div className="flex flex-wrap justify-center gap-2">
                    {genres.map((g) => (
                      <Badge key={g} variant="outline" className="text-sm px-3 py-1">
                        {g}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {socialLinks.length > 0 && (
                <div className="text-center">
                  <h2 className="font-semibold mb-3">Links</h2>
                  <div className="flex flex-wrap justify-center gap-2">
                    {socialLinks.map(([platform, url]) => (
                      <Button
                        key={platform}
                        variant="outline"
                        size="sm"
                        className="gap-1 capitalize"
                        onClick={() => {
                          const fullUrl = url.startsWith("http") ? url : `https://${url}`;
                          void openExternalUrl(fullUrl);
                        }}
                      >
                        <ExternalLink className="w-3 h-3" />
                        {platform}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {profile.bio && (
                <div className="text-center max-w-xl mx-auto">
                  <h2 className="font-semibold mb-3">About</h2>
                  <p className="text-muted-foreground">{profile.bio}</p>
                </div>
              )}

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                Joined {new Date(profile.created_at).toLocaleDateString()}
              </div>

              {currentUserId && !isOwner && (
                <div className="flex justify-center gap-3 pt-4">
                  <Button onClick={handleLike} className="gap-2">
                    <Heart className="w-5 h-5" />
                    Like Profile
                  </Button>
                  <FlagContentDialog
                    contentType="profile"
                    contentId={profile.id}
                    trigger={
                      <Button variant="outline" size="icon" className="text-muted-foreground hover:text-destructive">
                        <Flag className="w-5 h-5" />
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
              )}

              {!currentUserId && (
                <div className="flex flex-col items-center gap-2 pt-4">
                  <Button asChild>
                    <Link to="/auth">Join ArtistrySynk to collaborate</Link>
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Create a free account to message, match and collaborate with {profile.full_name}.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold leading-none tracking-tight">Portfolio highlights</h2>
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
      </div>
    </>
  );
};

export default PublicProfile;
