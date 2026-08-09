import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  MapPin,
  Calendar,
  Edit,
  Shield,
  Instagram,
  Twitter,
  Youtube,
  Link as LinkIcon,
  Github,
  Image as ImageIcon,
  BarChart3,
  Settings as SettingsIcon,
  BadgeCheck,
  Users as UsersIcon,
  Share2,
  Monitor,
  UserRound,
  LogOut,
} from "lucide-react";
import { InteractivePortfolio } from "@/components/portfolio/InteractivePortfolio";
import { PortfolioUpload } from "@/components/portfolio/PortfolioUpload";
import { VerificationRequestButton } from "@/components/profile/VerificationRequestButton";
import { UserSessions } from "@/components/profile/UserSessions";
import { ProfileAnalytics } from "@/components/profile/ProfileAnalytics";
import { ProfileCompletionProgress } from "@/components/profile/ProfileCompletionProgress";
import { useSessionTracking } from "@/hooks/useSessionTracking";
import { MyAppeals } from "@/components/content/MyAppeals";
import { ReferralCard } from "@/components/referral/ReferralCard";
import { getRoleLabel } from "@/lib/creativeRoles";
import {
  SegmentedControl,
  SectionHeader,
  StatBlock,
  Surface,
  Pressable,
  SkeletonTiles,
} from "@/components/native-ui";

type Tab = "portfolio" | "about" | "insights" | "account";

const TABS = [
  { key: "about", label: "About", icon: <UserRound className="h-3.5 w-3.5" /> },
  { key: "portfolio", label: "Work", icon: <ImageIcon className="h-3.5 w-3.5" /> },
  { key: "insights", label: "Insights", icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { key: "account", label: "Account", icon: <SettingsIcon className="h-3.5 w-3.5" /> },
];

const Profile = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  useSessionTracking();
  const [profile, setProfile] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [genres, setGenres] = useState<any[]>([]);
  const [allRoles, setAllRoles] = useState<string[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [counts, setCounts] = useState({ portfolio: 0, matches: 0 });
  const [tab, setTab] = useState<Tab>("about");
  const [loading, setLoading] = useState(true);

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/auth", { replace: true });
  };

  const loadProfile = useCallback(async (uid: string) => {
    const [{ data: profileData }, { data: rolesData }, { data: genresData }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).single(),
      supabase.from("user_creative_roles").select("role").eq("user_id", uid),
      supabase.from("user_genres").select("genre").eq("user_id", uid),
    ]);
    setProfile(profileData);
    setRoles(rolesData ?? []);
    setGenres(genresData ?? []);
    setLoading(false);
  }, []);

  const loadCounts = useCallback(async (uid: string) => {
    const [{ count: portfolio }, { count: matches }] = await Promise.all([
      supabase.from("portfolio_items").select("id", { count: "exact", head: true }).eq("user_id", uid),
      supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .or(`user_id_1.eq.${uid},user_id_2.eq.${uid}`),
    ]);
    setCounts({ portfolio: portfolio ?? 0, matches: matches ?? 0 });
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUserId(user.id);
      void loadProfile(user.id);
      void loadCounts(user.id);
      void supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .then(({ data }) => {
          const list = data?.map((r) => r.role as string) ?? ["user"];
          const priority = ["super_admin", "master_admin", "admin", "user"];
          setAllRoles(list);
          setUserRole(priority.find((p) => list.includes(p)) ?? "user");
        });
    });
  }, [navigate, loadProfile, loadCounts]);

  const socialLinks = (profile?.social_links ?? {}) as Record<string, string>;

  const adminLink =
    userRole === "super_admin"
      ? "/super-admin"
      : userRole === "master_admin"
        ? "/master-admin"
        : userRole === "admin"
          ? "/admin"
          : null;

  const share = async () => {
    const url = `${window.location.origin}/profile/${profile?.username ?? userId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: profile?.full_name ?? "ArtistrySynk", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Profile link copied");
      }
    } catch {
      /* user dismissed */
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 pt-2">
        <Surface className="h-36 animate-pulse" level={2} />
        <SkeletonTiles />
      </div>
    );
  }

  const socialEntries: { key: string; href: string; icon: typeof Instagram }[] = [
    socialLinks.instagram && {
      key: "instagram",
      href: `https://instagram.com/${socialLinks.instagram}`,
      icon: Instagram,
    },
    socialLinks.twitter && {
      key: "twitter",
      href: `https://twitter.com/${socialLinks.twitter}`,
      icon: Twitter,
    },
    socialLinks.youtube && {
      key: "youtube",
      href: `https://youtube.com/${socialLinks.youtube}`,
      icon: Youtube,
    },
    socialLinks.github && {
      key: "github",
      href: `https://github.com/${socialLinks.github}`,
      icon: Github,
    },
    socialLinks.website && {
      key: "website",
      href: socialLinks.website.startsWith("http")
        ? socialLinks.website
        : `https://${socialLinks.website}`,
      icon: LinkIcon,
    },
  ].filter(Boolean) as { key: string; href: string; icon: typeof Instagram }[];

  return (
    <div className="space-y-5">
      {/* Native profile header */}
      <Surface className="overflow-hidden" level={1}>
        <div className="relative h-28 w-full sm:h-36">
          {profile?.cover_image_url ? (
            <img
              src={profile.cover_image_url}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full" style={{ backgroundImage: "var(--gradient-primary)" }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-surface-1 via-surface-1/20 to-transparent" />
        </div>

        <div className="-mt-10 px-4 pb-4">
          <div className="flex items-end gap-3">
            <Avatar className="h-20 w-20 border-4 border-surface-1 shadow-app">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="text-2xl">{profile?.full_name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 pb-1">
              <h1 className="flex items-center gap-1.5 truncate text-lg font-bold tracking-tight">
                {profile?.full_name}
                {profile?.is_verified ? (
                  <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />
                ) : null}
              </h1>
              <p className="truncate text-xs text-muted-foreground">@{profile?.username}</p>
            </div>
            <Pressable
              onClick={share}
              aria-label="Share profile"
              className="mb-1 grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-foreground"
            >
              <Share2 className="h-4 w-4" />
            </Pressable>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {profile?.location ? (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {profile.location}
              </span>
            ) : null}
            {profile?.created_at ? (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Joined {new Date(profile.created_at).toLocaleDateString()}
              </span>
            ) : null}
          </div>

          {profile?.bio ? (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{profile.bio}</p>
          ) : null}

          <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-surface-2 py-3">
            <StatBlock label="Work" value={counts.portfolio} />
            <StatBlock label="Matches" value={counts.matches} onClick={() => navigate("/messages")} />
            <StatBlock label="Roles" value={roles.length} onClick={() => setTab("about")} />
          </div>

          <div className="mt-3 flex gap-2">
            <Button
              onClick={() => navigate("/edit-profile")}
              className="flex-1 rounded-full"
              variant="default"
            >
              <Edit className="mr-1.5 h-4 w-4" />
              Edit profile
            </Button>
            {userId ? (
              <VerificationRequestButton userId={userId} isVerified={profile?.is_verified ?? false} />
            ) : null}
          </div>

          {socialEntries.length ? (
            <div className="mt-3 flex items-center gap-2">
              {socialEntries.map(({ key, href, icon: Icon }) => (
                <a
                  key={key}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={key}
                  className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-muted-foreground transition-colors hover:text-primary"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </Surface>

      {userId ? <ProfileCompletionProgress userId={userId} /> : null}

      <div className="sticky top-0 z-20 -mx-4 bg-background/0 px-4 py-1">
        <SegmentedControl
          ariaLabel="Profile sections"
          layoutId="profile-tabs"
          segments={TABS}
          value={tab}
          onChange={(key) => setTab(key as Tab)}
        />
      </div>

      {tab === "portfolio" && userId ? (
        <div className="space-y-4">
          <PortfolioUpload userId={userId} onUploadComplete={() => { void loadProfile(userId); void loadCounts(userId); }} />
          <InteractivePortfolio userId={userId} editable />
        </div>
      ) : null}

      {tab === "about" ? (
        <div className="space-y-4">
          {roles.length ? (
            <Surface inset className="space-y-2">
              <SectionHeader title="Creative roles" className="px-0" />
              <div className="flex flex-wrap gap-2">
                {roles.map((r, i) => (
                  <Badge key={i} variant="secondary">
                    {getRoleLabel(r.role)}
                  </Badge>
                ))}
              </div>
            </Surface>
          ) : null}

          {profile?.looking_for?.length ? (
            <Surface inset className="space-y-2">
              <SectionHeader
                title="Looking for"
                className="px-0"
                action={<UsersIcon className="h-4 w-4 text-muted-foreground" />}
              />
              <div className="flex flex-wrap gap-2">
                {profile.looking_for.map((r: string, i: number) => (
                  <Badge key={i} variant="outline">
                    {getRoleLabel(r)}
                  </Badge>
                ))}
              </div>
            </Surface>
          ) : null}

          {genres.length ? (
            <Surface inset className="space-y-2">
              <SectionHeader title="Genres" className="px-0" />
              <div className="flex flex-wrap gap-2">
                {genres.map((g, i) => (
                  <Badge key={i} variant="outline">
                    {g.genre.replace("_", " ")}
                  </Badge>
                ))}
              </div>
            </Surface>
          ) : null}

          {!roles.length && !genres.length && !profile?.looking_for?.length ? (
            <Surface inset className="text-center text-sm text-muted-foreground">
              Add your roles, genres and what you're looking for so we can match you better.
              <Button
                variant="outline"
                className="mt-3 w-full rounded-full"
                onClick={() => navigate("/edit-profile")}
              >
                Complete your profile
              </Button>
            </Surface>
          ) : null}
        </div>
      ) : null}

      {tab === "insights" && userId ? (
        <div className="space-y-4">
          <ProfileAnalytics userId={userId} />
          <Surface inset className="space-y-3">
            <SectionHeader
              title="Devices & sessions"
              className="px-0"
              action={<Monitor className="h-4 w-4 text-muted-foreground" />}
            />
            <UserSessions userId={userId} />
          </Surface>
        </div>
      ) : null}

      {tab === "account" ? (
        <div className="space-y-4">
          <ReferralCard />
          <MyAppeals />

          <Surface className="divide-y divide-border/40">
            <Row label="Account type" value={(userRole ?? "user").replace("_", " ")} />
            <Row
              label="Verification"
              value={profile?.is_verified ? "Verified" : "Not verified"}
            />
            <Pressable
              onClick={() => navigate("/settings")}
              className="flex w-full items-center justify-between p-4 text-left"
              aria-label="Open settings"
            >
              <span className="text-sm font-medium">Settings & privacy</span>
              <SettingsIcon className="h-4 w-4 text-muted-foreground" />
            </Pressable>
          </Surface>

          <Button
            variant="outline"
            className="w-full gap-2 rounded-full"
            onClick={handleSignOut}
            aria-label="Sign out of your account"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>

          {allRoles.some((r) => r !== "user") ? (
            <Surface inset className="space-y-3">
              <SectionHeader title="Admin access" className="px-0" />
              <div className="flex flex-wrap gap-2">
                {allRoles
                  .filter((r) => r !== "user")
                  .map((role) => (
                    <Badge key={role} className="gap-1">
                      <Shield className="h-3 w-3" />
                      {role.replace("_", " ").toUpperCase()}
                    </Badge>
                  ))}
              </div>
              {adminLink ? (
                <Link to={adminLink}>
                  <Button size="sm" className="w-full rounded-full">
                    <Shield className="mr-1.5 h-4 w-4" />
                    Open admin panel
                  </Button>
                </Link>
              ) : null}
            </Surface>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-4">
      <span className="text-sm font-medium">{label}</span>
      <span className="text-xs capitalize text-muted-foreground">{value}</span>
    </div>
  );
}

export default Profile;
