import { useState, useEffect } from "react";
import { useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Code, Palette, Music, Briefcase, Loader2, ArrowRight } from "lucide-react";
import { getRoleLabel } from "@/lib/creativeRoles";
import { PageSEO } from "@/components/seo";

interface TrendingCreator {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  is_verified: boolean | null;
  roles: string[];
  engagement: number;
}

const CATEGORY_ROLES = {
  artists: ["artist", "musician", "singer", "rapper", "producer", "songwriter", "dj", "beatmaker"],
  developers: ["software_developer", "frontend_developer", "backend_developer", "full_stack_developer", "mobile_app_developer", "ai_engineer", "blockchain_developer", "game_developer"],
  designers: ["graphic_designer", "ui_designer", "ux_designer", "product_designer", "designer", "illustrator", "3d_designer"],
};

const Explore = () => {
  const navigate = useNavigate();
  const [trendingArtists, setTrendingArtists] = useState<TrendingCreator[]>([]);
  const [featuredDevs, setFeaturedDevs] = useState<TrendingCreator[]>([]);
  const [topDesigners, setTopDesigners] = useState<TrendingCreator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) navigate("/auth");
      else loadAll();
    });
  }, [navigate]);

  const loadAll = async () => {
    await Promise.all([
      loadByCategory("artists", CATEGORY_ROLES.artists, setTrendingArtists),
      loadByCategory("developers", CATEGORY_ROLES.developers, setFeaturedDevs),
      loadByCategory("designers", CATEGORY_ROLES.designers, setTopDesigners),
    ]);
    setLoading(false);
  };

  const loadByCategory = async (
    _category: string,
    roleValues: string[],
    setter: (val: TrendingCreator[]) => void
  ) => {
    // Get user IDs with matching roles
    const { data: roleData } = await supabase
      .from("user_creative_roles")
      .select("user_id")
      .in("role", roleValues as any);

    if (!roleData || roleData.length === 0) {
      setter([]);
      return;
    }

    const userIds = [...new Set(roleData.map(r => r.user_id))];

    // Get profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, is_verified")
      .in("id", userIds)
      .limit(12);

    if (!profiles) { setter([]); return; }

    // Get all roles for these users
    const { data: allRolesData } = await supabase
      .from("user_creative_roles")
      .select("user_id, role")
      .in("user_id", profiles.map(p => p.id));

    const roleMap: Record<string, string[]> = {};
    (allRolesData || []).forEach(r => {
      if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
      roleMap[r.user_id].push(r.role);
    });

    // Get engagement (swipe likes received) for sorting
    const { data: likesData } = await supabase
      .from("swipes")
      .select("swiped_id")
      .eq("liked", true)
      .in("swiped_id", profiles.map(p => p.id));

    const likeMap: Record<string, number> = {};
    (likesData || []).forEach(l => {
      likeMap[l.swiped_id] = (likeMap[l.swiped_id] || 0) + 1;
    });

    const results: TrendingCreator[] = profiles.map(p => ({
      ...p,
      roles: roleMap[p.id] || [],
      engagement: likeMap[p.id] || 0,
    }));

    // Sort by engagement
    results.sort((a, b) => b.engagement - a.engagement);

    setter(results);
  };

  const CreatorGrid = ({ creators, emptyText }: { creators: TrendingCreator[]; emptyText: string }) => {
    if (creators.length === 0) {
      return <p className="text-center text-muted-foreground py-8">{emptyText}</p>;
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {creators.map((creator, idx) => (
          <Card
            key={creator.id}
            className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1"
            onClick={() => navigate(`/profile/${creator.id}`)}
          >
            <CardContent className="p-4 text-center">
              <div className="relative inline-block mb-3">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={creator.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xl">{creator.full_name?.charAt(0)}</AvatarFallback>
                </Avatar>
                {idx < 3 && (
                  <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                    {idx + 1}
                  </span>
                )}
              </div>
              <p className="font-semibold text-sm truncate">
                {creator.full_name}
                {creator.is_verified && <span className="text-primary ml-1">✓</span>}
              </p>
              <p className="text-xs text-muted-foreground">@{creator.username}</p>
              {creator.roles[0] && (
                <Badge variant="secondary" className="text-xs mt-2 truncate max-w-full">
                  {getRoleLabel(creator.roles[0])}
                </Badge>
              )}
              {creator.engagement > 0 && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  <TrendingUp className="w-3 h-3" /> {creator.engagement} likes
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-4">
      <PageSEO
        title="Explore Top Creative Talent | ArtistrySynk"
        description="Browse trending artists, featured developers, and top designers across the ArtistrySynk network. Discover creators by category and find your next collaborator."
        canonicalUrl="https://artistrysynk.app/explore"
        noIndex
      />
      <div className="max-w-6xl mx-auto py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Explore Creators
            </h1>
            <p className="text-muted-foreground">Discover top talent across categories</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/explore/nearby")}>
              Creators Near You
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/open-projects")}>
              Open Projects
            </Button>
          </div>
        </div>

        <Tabs defaultValue="artists">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="artists" className="gap-2">
              <Music className="w-4 h-4" />
              Trending Artists
            </TabsTrigger>
            <TabsTrigger value="developers" className="gap-2">
              <Code className="w-4 h-4" />
              Featured Developers
            </TabsTrigger>
            <TabsTrigger value="designers" className="gap-2">
              <Palette className="w-4 h-4" />
              Top Designers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="artists" className="mt-6">
            <CreatorGrid creators={trendingArtists} emptyText="No artists to show yet" />
          </TabsContent>
          <TabsContent value="developers" className="mt-6">
            <CreatorGrid creators={featuredDevs} emptyText="No developers to show yet" />
          </TabsContent>
          <TabsContent value="designers" className="mt-6">
            <CreatorGrid creators={topDesigners} emptyText="No designers to show yet" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Explore;
