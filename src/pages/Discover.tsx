import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Heart, X, User, MapPin, Sparkles, Filter, RotateCcw, Crown, Zap, BadgeCheck, ShieldCheck } from "lucide-react";
import { DiscoverProfileCard } from "@/components/discover/DiscoverProfileCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Constants } from "@/integrations/supabase/types";
import { FeaturedCreatives } from "@/components/discover/FeaturedCreatives";
import { getRoleLabel } from "@/lib/creativeRoles";
import { FeaturedProfiles } from "@/components/discover/FeaturedProfiles";
import { TrendingCollaborations } from "@/components/discover/TrendingCollaborations";
import { useSubscription } from "@/hooks/useSubscription";

interface Profile {
  id: string;
  full_name: string;
  username: string;
  bio: string;
  location: string;
  avatar_url: string;
  is_verified?: boolean;
  is_featured?: boolean;
  user_creative_roles: { role: string }[];
  user_genres: { genre: string }[];
  user_skill_tags?: { skill: string }[];
  synergyScore?: number;
  matchReason?: string;
}

const Discover = () => {
  const navigate = useNavigate();
  const { canRewindSwipes, hasAdvancedMatching } = useSubscription();
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [aiMatchingEnabled, setAiMatchingEnabled] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [genreFilter, setGenreFilter] = useState<string>("");
  const [locationFilter, setLocationFilter] = useState<string>("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [lastSwipe, setLastSwipe] = useState<{ id: string; swipedId: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setCurrentUser(user.id);
        loadCurrentUserProfile(user.id);
        loadProfiles(user.id);
      }
    });
  }, [navigate]);

  const loadCurrentUserProfile = async (userId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select(`
        *,
        user_creative_roles(role),
        user_genres(genre)
      `)
      .eq('id', userId)
      .single();

    const { data: skills } = await supabase
      .from('user_skill_tags')
      .select('skill')
      .eq('user_id', userId);

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

  const loadProfiles = async (userId: string) => {
    setLoading(true);
    
    const { data: swipedIds } = await supabase
      .from('swipes')
      .select('swiped_id')
      .eq('swiper_id', userId);

    const excludeIds = [userId, ...(swipedIds?.map(s => s.swiped_id) || [])];

    let query = supabase
      .from('profiles')
      .select(`
        *,
        user_creative_roles(role),
        user_genres(genre)
      `)
      .not('id', 'in', `(${excludeIds.join(',')})`)
      .limit(20);

    if (locationFilter) {
      query = query.ilike('location', `%${locationFilter}%`);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Failed to load profiles");
    } else {
      let filteredData = data || [];
      
      if (roleFilter) {
        filteredData = filteredData.filter(p => 
          p.user_creative_roles.some((r: any) => r.role === roleFilter)
        );
      }
      
      if (genreFilter) {
        filteredData = filteredData.filter(p => 
          p.user_genres.some((g: any) => g.genre === genreFilter)
        );
      }
      
      // Apply AI matching if enabled and user has advanced matching
      if (aiMatchingEnabled && hasAdvancedMatching && currentUserProfile && filteredData.length > 0) {
        try {
          const candidates = filteredData.map(p => ({
            id: p.id,
            full_name: p.full_name,
            location: p.location,
            bio: p.bio,
            roles: p.user_creative_roles?.map((r: any) => r.role) || [],
            genres: p.user_genres?.map((g: any) => g.genre) || [],
            skills: [],
          }));

          const response = await supabase.functions.invoke('ai-match-scoring', {
            body: { currentUser: currentUserProfile, candidates }
          });

          if (response.data?.scoredProfiles) {
            // Map scored profiles back to original data with scores
            const scoredMap = new Map(response.data.scoredProfiles.map((p: any) => [p.id, p]));
            filteredData = filteredData.map(p => ({
              ...p,
              synergyScore: (scoredMap.get(p.id) as any)?.synergyScore || 50,
              matchReason: (scoredMap.get(p.id) as any)?.matchReason || undefined,
            })).sort((a, b) => (b.synergyScore || 0) - (a.synergyScore || 0));
          }
        } catch (err) {
          console.error("AI matching failed:", err);
          // Continue without AI scoring
        }
      }
      
      setProfiles(filteredData);
      setCurrentIndex(0);
    }
    
    setLoading(false);
  };

  const applyFilters = () => {
    if (currentUser) {
      loadProfiles(currentUser);
    }
  };

  const handleSwipe = async (liked: boolean) => {
    if (!currentUser || !profiles[currentIndex] || isTransitioning) return;

    setIsTransitioning(true);

    const { data, error } = await supabase
      .from('swipes')
      .insert({
        swiper_id: currentUser,
        swiped_id: profiles[currentIndex].id,
        liked,
      })
      .select('id')
      .single();

    if (error) {
      toast.error("Failed to swipe");
      setIsTransitioning(false);
      return;
    }

    // Store last swipe for rewind
    setLastSwipe({ id: data.id, swipedId: profiles[currentIndex].id });

    if (liked) {
      // Check if it's a match
      const { data: matchData } = await supabase
        .from('matches')
        .select('*')
        .or(`user_id_1.eq.${currentUser},user_id_2.eq.${currentUser}`)
        .or(`user_id_1.eq.${profiles[currentIndex].id},user_id_2.eq.${profiles[currentIndex].id}`);

      if (matchData && matchData.length > 0) {
        toast.success("🎉 It's a match!", {
          description: `You matched with ${profiles[currentIndex].full_name}!`,
        });
      }
    }

    // Delay to show skeleton transition
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
      setIsTransitioning(false);
    }, 300);
  };

  const handleRewind = async () => {
    if (!lastSwipe || !canRewindSwipes) {
      if (!canRewindSwipes) {
        toast.error("Upgrade to Pro to use Rewind", {
          action: {
            label: "Upgrade",
            onClick: () => navigate("/pricing"),
          },
        });
      }
      return;
    }

    // Delete the last swipe
    const { error } = await supabase
      .from('swipes')
      .delete()
      .eq('id', lastSwipe.id);

    if (error) {
      toast.error("Failed to rewind");
      return;
    }

    // Record the rewind
    await supabase.from('swipe_rewinds').insert({
      user_id: currentUser,
      swipe_id: lastSwipe.id,
    });

    toast.success("Swipe undone!");
    setCurrentIndex(prev => Math.max(0, prev - 1));
    setLastSwipe(null);
  };

  const currentProfile = profiles[currentIndex];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-secondary/5">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Finding amazing creatives...</p>
        </div>
      </div>
    );
  }

  if (!currentProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <Sparkles className="w-12 h-12 mx-auto text-secondary" />
            <h2 className="text-2xl font-bold">You've seen everyone!</h2>
            <p className="text-muted-foreground">Check back later for more creatives</p>
            <div className="flex gap-3">
              <Button variant="hero" onClick={() => navigate("/matches")}>
                View Your Matches
              </Button>
              <Button variant="outline" onClick={() => loadProfiles(currentUser!)}>
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-4">
      <div className="max-w-md mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Discover
          </h1>
          <p className="text-muted-foreground">Find your creative collaborators</p>
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="mt-4">
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {(roleFilter || genreFilter || locationFilter) && (
                  <Badge variant="secondary" className="ml-2">Active</Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filter Creatives</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All roles</SelectItem>
                      {Constants.public.Enums.creative_role.map((role) => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Genre</label>
                  <Select value={genreFilter} onValueChange={setGenreFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All genres" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All genres</SelectItem>
                      {Constants.public.Enums.genre.map((genre) => (
                        <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Location</label>
                  <Input
                    placeholder="Enter location"
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                  />
                </div>
                <Button onClick={applyFilters} className="w-full">
                  Apply Filters
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setRoleFilter("");
                    setGenreFilter("");
                    setLocationFilter("");
                    if (currentUser) loadProfiles(currentUser);
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <FeaturedProfiles />
        <FeaturedCreatives />
        <TrendingCollaborations />

        {isTransitioning ? (
          <div className="rounded-xl overflow-hidden border border-border bg-card shadow-lg">
            <div className="flex flex-col md:flex-row min-h-[420px]">
              <div className="md:w-1/2 w-full aspect-square md:aspect-auto">
                <Skeleton className="w-full h-full" />
              </div>
              <div className="md:w-1/2 w-full p-5 space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-6 w-40 rounded-lg" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
                <Skeleton className="h-16 w-full" />
                <div className="flex gap-1.5">
                  <Skeleton className="h-12 w-12 rounded-md" />
                  <Skeleton className="h-12 w-12 rounded-md" />
                  <Skeleton className="h-12 w-12 rounded-md" />
                </div>
                <div className="flex gap-3 pt-4">
                  <Skeleton className="h-12 flex-1 rounded-md" />
                  <Skeleton className="h-11 w-11 rounded-md" />
                  <Skeleton className="h-12 flex-1 rounded-md" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <DiscoverProfileCard
            profile={currentProfile}
            currentUserId={currentUser!}
            onSwipe={handleSwipe}
            onRewind={handleRewind}
            canRewind={canRewindSwipes}
            hasLastSwipe={!!lastSwipe}
            isTransitioning={isTransitioning}
          />
        )}
      </div>
    </div>
  );
};

export default Discover;
