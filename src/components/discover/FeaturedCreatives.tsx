import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, MapPin, Verified, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
interface FeaturedCreative {
  id: string;
  user_id: string;
  reason: string | null;
  profiles: {
    id: string;
    full_name: string;
    username: string;
    avatar_url: string | null;
    location: string | null;
    is_verified: boolean;
  };
  user_creative_roles: { role: string }[];
}

export const FeaturedCreatives = () => {
  const navigate = useNavigate();
  const [featured, setFeatured] = useState<FeaturedCreative[]>([]);
  const [loading, setLoading] = useState(true);
  const [api, setApi] = useState<CarouselApi>();
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    loadFeaturedCreatives();
  }, []);

  const loadFeaturedCreatives = async () => {
    const { data: featuredData, error } = await supabase
      .from("featured_creatives")
      .select("id, user_id, reason")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error || !featuredData || featuredData.length === 0) {
      setLoading(false);
      return;
    }

    const userIds = featuredData.map(f => f.user_id);
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, location, is_verified")
      .in("id", userIds);

    const { data: rolesData } = await supabase
      .from("user_creative_roles")
      .select("user_id, role")
      .in("user_id", userIds);

    const enrichedData = featuredData.map(item => {
      const profile = profilesData?.find(p => p.id === item.user_id);
      const roles = rolesData?.filter(r => r.user_id === item.user_id) || [];
      
      return {
        ...item,
        profiles: profile || { id: item.user_id, full_name: "Unknown", username: "unknown", avatar_url: null, location: null, is_verified: false },
        user_creative_roles: roles.map(r => ({ role: r.role })),
      };
    });

    setFeatured(enrichedData as FeaturedCreative[]);
    setLoading(false);
  };

  // Auto-scroll functionality
  useEffect(() => {
    if (!api || isPaused || featured.length === 0) return;

    const interval = setInterval(() => {
      api.scrollNext();
    }, 3000);

    return () => clearInterval(interval);
  }, [api, isPaused, featured.length]);

  if (loading) {
    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-full bg-gradient-to-r from-secondary to-accent">
            <Sparkles className="w-4 h-4 text-secondary-foreground" />
          </div>
          <h2 className="text-lg font-semibold">Featured Creatives</h2>
        </div>
        <div className="flex gap-3 overflow-hidden">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-44 flex-shrink-0 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (featured.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-full bg-gradient-to-r from-secondary to-accent animate-pulse">
          <Star className="w-4 h-4 text-secondary-foreground fill-current" />
        </div>
        <h2 className="text-lg font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
          Featured Creatives
        </h2>
        <Badge variant="secondary" className="ml-auto text-xs">
          Top Talent
        </Badge>
      </div>
      
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        setApi={setApi}
        className="w-full"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <CarouselContent className="-ml-2">
          {featured.map((item) => (
            <CarouselItem key={item.id} className="pl-2 basis-[160px] md:basis-[180px]">
              <Card
                className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-[1.03] overflow-hidden group border-0 bg-gradient-to-br from-card to-card/80 shadow-md"
                onClick={() => navigate(`/profile/${item.user_id}`)}
              >
                <div className="relative">
                  {/* Avatar Section with Gradient Background */}
                  <div className="h-24 bg-gradient-to-br from-primary/30 via-secondary/20 to-accent/30 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,hsl(var(--secondary)/0.4),transparent_70%)]" />
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
                      <Avatar className="w-16 h-16 border-4 border-card shadow-lg ring-2 ring-secondary/30 group-hover:ring-secondary/60 transition-all">
                        <AvatarImage src={item.profiles.avatar_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground text-lg font-bold">
                          {item.profiles.full_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    {item.profiles.is_verified && (
                      <div className="absolute top-2 right-2 p-1 rounded-full bg-primary/90 shadow-lg">
                        <Verified className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  
                  <CardContent className="pt-10 pb-3 px-3 text-center">
                    <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                      {item.profiles.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      @{item.profiles.username}
                    </p>
                    
                    {item.profiles.location && (
                      <div className="flex items-center justify-center gap-1 mt-1.5 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate max-w-[80px]">{item.profiles.location}</span>
                      </div>
                    )}

                    {item.user_creative_roles.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-1 mt-2">
                        {item.user_creative_roles.slice(0, 2).map((r, i) => (
                          <Badge 
                            key={i} 
                            variant="secondary" 
                            className="text-[10px] px-1.5 py-0 bg-secondary/50 hover:bg-secondary/70"
                          >
                            {r.role}
                          </Badge>
                        ))}
                        {item.user_creative_roles.length > 2 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            +{item.user_creative_roles.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}

                    {item.reason && (
                      <p className="text-[10px] text-muted-foreground mt-2 italic line-clamp-1">
                        "{item.reason}"
                      </p>
                    )}
                  </CardContent>
                </div>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex -left-4 h-8 w-8 bg-card/90 backdrop-blur-sm border-secondary/30 hover:bg-secondary hover:text-secondary-foreground" />
        <CarouselNext className="hidden md:flex -right-4 h-8 w-8 bg-card/90 backdrop-blur-sm border-secondary/30 hover:bg-secondary hover:text-secondary-foreground" />
      </Carousel>
    </div>
  );
};
