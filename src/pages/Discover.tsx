import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sparkles, SlidersHorizontal, Zap, Users, RefreshCw } from "lucide-react";
import { DiscoverProfileCard } from "@/components/discover/DiscoverProfileCard";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Constants } from "@/integrations/supabase/types";
import { getRoleLabel } from "@/lib/creativeRoles";
import { useSubscription } from "@/hooks/useSubscription";
import { PageSEO } from "@/components/seo";
import { useServerFn } from "@tanstack/react-start";
import { scoreMatches } from "@/lib/ai-match-scoring.functions";
import { AppShell } from "@/components/app-shell/AppShell";
import {
  BottomSheet,
  Chip,
  EmptyState,
  Pressable,
  Surface,
  SkeletonCard,
  haptic,
} from "@/components/native-ui";

interface Profile {
  id: string;
  full_name: string;
  username: string;
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
  is_verified?: boolean | null;
  is_featured?: boolean | null;
  user_creative_roles: { role: string }[];
  user_genres: { genre: string }[];
  user_skill_tags?: { skill: string }[];
  synergyScore?: number;
  matchReason?: string;
}

const Discover = () => {
  const navigate = useNavigate();
  const scoreMatchesFn = useServerFn(scoreMatches);
  const { canRewindSwipes, hasAdvancedMatching } = useSubscription();
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [aiMatchingEnabled, setAiMatchingEnabled] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [genreFilter, setGenreFilter] = useState<string>("all");
  const [skillFilter, setSkillFilter] = useState<string>("");
  const [locationFilter, setLocationFilter] = useState<string>("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [lastSwipe, setLastSwipe] = useState<{ id: string; swipedId: string } | null>(null);

  const activeFilterCount =
    (roleFilter !== "all" ? 1 : 0) +
    (genreFilter !== "all" ? 1 : 0) +
    (skillFilter.trim() ? 1 : 0) +
    (locationFilter.trim() ? 1 : 0);

  const loadCurrentUserProfile = async (userId: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select(`*, user_creative_roles(role), user_genres(genre)`)
      .eq("id", userId)
      .single();

    const { data: skills } = await supabase
      .from("user_skill_tags")
      .select("skill")
      .eq("user_id", userId);

    if (profile) {
      setCurrentUserProfile({
        id: profile.id,
        full_name: profile.full_name,
        location: profile.location,
        bio: profile.bio,
        roles: profile.user_creative_roles?.map((r: any) => r.role) || [],
        genres: profile.user_genres?.map((g: any) => g.genre) || [],
        skills: skills?.map((s: any) => s.skill) || [],
      });
    }
  };

  const loadProfiles = useCallback(
    async (userId: string) => {
      setLoading(true);

      const { data: swipedIds } = await supabase
        .from("swipes")
        .select("swiped_id")
        .eq("swiper_id", userId);

      const excludeIds = [userId, ...(swipedIds?.map((s) => s.swiped_id) || [])];

      let query = supabase
        .from("profiles")
        .select(`*, user_creative_roles(role), user_genres(genre)`)
        .not("id", "in", `(${excludeIds.join(",")})`)
        .limit(20);

      if (locationFilter) {
        query = query.ilike("location", `%${locationFilter}%`);
      }

      const { data, error } = await query;

      if (error) {
        toast.error("Failed to load profiles");
        setLoading(false);
        return;
      }

      let filteredData: any[] = data || [];

      if (roleFilter !== "all") {
        filteredData = filteredData.filter((p) =>
          p.user_creative_roles.some((r: any) => r.role === roleFilter),
        );
      }

      if (genreFilter !== "all") {
        filteredData = filteredData.filter((p) =>
          p.user_genres.some((g: any) => g.genre === genreFilter),
        );
      }

      if (skillFilter.trim()) {
        const needle = skillFilter.trim().toLowerCase();
        const ids = filteredData.map((p: any) => p.id);
        if (ids.length > 0) {
          const { data: skillRows } = await supabase
            .from("user_skill_tags")
            .select("user_id, skill")
            .in("user_id", ids)
            .ilike("skill", `%${needle}%`);
          const matchedIds = new Set((skillRows || []).map((r: any) => r.user_id));
          filteredData = filteredData.filter((p: any) => matchedIds.has(p.id));
        }
      }

      if (aiMatchingEnabled && hasAdvancedMatching && currentUserProfile && filteredData.length > 0) {
        try {
          const candidates = filteredData.map((p) => ({
            id: p.id,
            full_name: p.full_name,
            location: p.location,
            bio: p.bio,
            roles: p.user_creative_roles?.map((r: any) => r.role) || [],
            genres: p.user_genres?.map((g: any) => g.genre) || [],
            skills: [],
          }));

          const response = await scoreMatchesFn({
            data: { currentUser: currentUserProfile, candidates },
          });

          if (response?.scoredProfiles) {
            const scoredMap = new Map(response.scoredProfiles.map((p: any) => [p.id, p]));
            filteredData = filteredData
              .map((p) => ({
                ...p,
                synergyScore: (scoredMap.get(p.id) as any)?.synergyScore || 50,
                matchReason: (scoredMap.get(p.id) as any)?.matchReason || undefined,
              }))
              .sort((a, b) => (b.synergyScore || 0) - (a.synergyScore || 0));
          }
        } catch (err) {
          console.error("AI matching failed:", err);
        }
      }

      setProfiles(filteredData);
      setCurrentIndex(0);
      setLoading(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roleFilter, genreFilter, skillFilter, locationFilter, aiMatchingEnabled, hasAdvancedMatching, currentUserProfile],
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setCurrentUser(user.id);
        void loadCurrentUserProfile(user.id);
        void loadProfiles(user.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const applyFilters = () => {
    setFiltersOpen(false);
    if (currentUser) void loadProfiles(currentUser);
  };

  const clearFilters = () => {
    setRoleFilter("all");
    setGenreFilter("all");
    setSkillFilter("");
    setLocationFilter("");
  };

  const handleSwipe = async (liked: boolean) => {
    if (!currentUser || !profiles[currentIndex] || isTransitioning) return;

    setIsTransitioning(true);
    haptic(liked ? 14 : 8);

    const { data, error } = await supabase
      .from("swipes")
      .insert({ swiper_id: currentUser, swiped_id: profiles[currentIndex].id, liked })
      .select("id")
      .single();

    if (error) {
      toast.error("Failed to swipe");
      setIsTransitioning(false);
      return;
    }

    setLastSwipe({ id: data.id, swipedId: profiles[currentIndex].id });

    if (liked) {
      const { data: matchData } = await supabase
        .from("matches")
        .select("*")
        .or(`user_id_1.eq.${currentUser},user_id_2.eq.${currentUser}`)
        .or(`user_id_1.eq.${profiles[currentIndex].id},user_id_2.eq.${profiles[currentIndex].id}`);

      if (matchData && matchData.length > 0) {
        toast.success("🎉 It's a match!", {
          description: `You matched with ${profiles[currentIndex].full_name}!`,
        });
      }
    }

    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      setIsTransitioning(false);
    }, 260);
  };

  const handleRewind = async () => {
    if (!lastSwipe || !canRewindSwipes) {
      if (!canRewindSwipes) {
        toast.error("Upgrade to Pro to use Rewind", {
          action: { label: "Upgrade", onClick: () => navigate("/pricing") },
        });
      }
      return;
    }

    const { error } = await supabase.from("swipes").delete().eq("id", lastSwipe.id);
    if (error) {
      toast.error("Failed to rewind");
      return;
    }

    if (currentUser) {
      await supabase.from("swipe_rewinds").insert({ user_id: currentUser, swipe_id: lastSwipe.id });
    }

    toast.success("Swipe undone");
    setCurrentIndex((prev) => Math.max(0, prev - 1));
    setLastSwipe(null);
  };

  const currentProfile = profiles[currentIndex];
  const remaining = Math.max(profiles.length - currentIndex, 0);

  return (
    <AppShell
      title="Discover"
      right={
        <Pressable
          onClick={() => setFiltersOpen(true)}
          aria-label={`Filters${activeFilterCount ? `, ${activeFilterCount} active` : ""}`}
          className="relative grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-foreground"
        >
          <SlidersHorizontal className="h-[18px] w-[18px]" />
          {activeFilterCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
              {activeFilterCount}
            </span>
          ) : null}
        </Pressable>
      }
    >
      <PageSEO
        title="Discover Creatives — Swipe to Match | ArtistrySynk"
        description="Swipe through musicians, producers, dancers, actors and creative professionals. Match with collaborators and start building together on ArtistrySynk."
        canonicalUrl="https://artistrysynk.app/discover"
        noIndex
      />

      {/* Quick filter chips */}
      <div className="app-scroll -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip active={activeFilterCount === 0} onClick={clearFilters} aria-label="Everyone">
          Everyone
        </Chip>
        <Chip
          active={aiMatchingEnabled}
          icon={<Zap className="h-3.5 w-3.5" />}
          onClick={() => {
            if (!hasAdvancedMatching) {
              toast.error("AI synergy matching is a Pro feature", {
                action: { label: "Upgrade", onClick: () => navigate("/pricing") },
              });
              return;
            }
            setAiMatchingEnabled((v) => !v);
            if (currentUser) void loadProfiles(currentUser);
          }}
        >
          AI synergy
        </Chip>
        <Chip active={!!locationFilter} onClick={() => setFiltersOpen(true)}>
          {locationFilter || "Location"}
        </Chip>
        <Chip active={roleFilter !== "all"} onClick={() => setFiltersOpen(true)}>
          {roleFilter !== "all" ? getRoleLabel(roleFilter as any) : "Role"}
        </Chip>
        <Chip active={genreFilter !== "all"} onClick={() => setFiltersOpen(true)}>
          {genreFilter !== "all" ? genreFilter : "Genre"}
        </Chip>
      </div>

      {loading || isTransitioning ? (
        <SkeletonCard />
      ) : !currentProfile ? (
        <EmptyState
          icon={<Sparkles className="h-6 w-6" />}
          title="You've seen everyone"
          description="Adjust your filters or check back soon — new creatives join every day."
          action={
            <div className="flex gap-2">
              <Button size="sm" onClick={() => currentUser && loadProfiles(currentUser)}>
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Refresh
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate("/messages")}>
                <Users className="mr-1.5 h-4 w-4" />
                Your matches
              </Button>
            </div>
          }
        />
      ) : (
        <div className="space-y-3">
          <DiscoverProfileCard
            profile={currentProfile as any}
            currentUserId={currentUser!}
            onSwipe={handleSwipe}
            onRewind={handleRewind}
            canRewind={canRewindSwipes}
            hasLastSwipe={!!lastSwipe}
            isTransitioning={isTransitioning}
          />
          <p className="text-center text-xs text-muted-foreground">
            {remaining} {remaining === 1 ? "creative" : "creatives"} left in this stack
          </p>
        </div>
      )}

      <BottomSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Filter creatives"
        description="All filters are optional. Leave blank to browse everyone."
      >
        <div className="space-y-4 pb-2">
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {Constants.public.Enums.creative_role.map((role) => (
                  <SelectItem key={role} value={role}>
                    {getRoleLabel(role as any)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Genre</Label>
            <Select value={genreFilter} onValueChange={setGenreFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All genres" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All genres</SelectItem>
                {Constants.public.Enums.genre.map((genre) => (
                  <SelectItem key={genre} value={genre}>
                    {genre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="skill-filter">Skill</Label>
            <Input
              id="skill-filter"
              placeholder="e.g. mixing, guitar, photoshop"
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location-filter">Location</Label>
            <Input
              id="location-filter"
              placeholder="City or country"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            />
          </div>

          <Surface level={2} inset className="flex items-center justify-between">
            <div className="pr-3">
              <p className="text-sm font-medium">AI synergy ranking</p>
              <p className="text-xs text-muted-foreground">
                {hasAdvancedMatching ? "Sort the stack by predicted creative fit." : "Pro feature"}
              </p>
            </div>
            <Switch
              checked={aiMatchingEnabled}
              disabled={!hasAdvancedMatching}
              onCheckedChange={setAiMatchingEnabled}
              aria-label="AI synergy ranking"
            />
          </Surface>

          <div className="flex gap-2 pb-4">
            <Button variant="outline" className="flex-1" onClick={clearFilters}>
              Clear
            </Button>
            <Button className="flex-1" onClick={applyFilters}>
              Show results
            </Button>
          </div>
        </div>
      </BottomSheet>
    </AppShell>
  );
};

export default Discover;
