import { useState, useEffect } from "react";
import { useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, MapPin, Star, Verified } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

interface FeaturedProfile {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  location: string | null;
  is_verified: boolean | null;
  bio: string | null;
  user_creative_roles: { role: string }[];
}

export const FeaturedProfiles = () => {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<FeaturedProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeaturedProfiles();
  }, []);

  const loadFeaturedProfiles = async () => {
    // Load Pro/Studio users who have featured status or subscription
    const { data: subscriptions } = await supabase
      .from("user_subscriptions")
      .select("user_id")
      .in("tier", ["pro", "studio"])
      .eq("status", "active")
      .limit(20);

    if (!subscriptions || subscriptions.length === 0) {
      setLoading(false);
      return;
    }

    const userIds = subscriptions.map(s => s.user_id);

    const { data: profilesData, error } = await supabase
      .from("profiles")
      .select(`
        id, full_name, username, avatar_url, location, is_verified, bio,
        user_creative_roles(role)
      `)
      .in("id", userIds)
      .not("avatar_url", "is", null)
      .limit(10);

    if (error) {
      console.error("Error loading featured profiles:", error);
    } else {
      setProfiles((profilesData as unknown as FeaturedProfile[]) || []);
    }
    setLoading(false);
  };

  if (loading || profiles.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Star className="w-5 h-5 text-yellow-500" />
        <h2 className="text-lg font-semibold">Featured Creatives</h2>
        <Badge variant="secondary" className="text-xs">
          <Crown className="w-3 h-3 mr-1" />
          Pro & Studio
        </Badge>
      </div>

      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2">
          {profiles.map((profile) => (
            <CarouselItem key={profile.id} className="pl-2 basis-[200px] md:basis-[220px] lg:basis-[240px]">
              <Card 
                className="cursor-pointer hover:shadow-lg transition-all border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5"
                onClick={() => navigate(`/profile/${profile.username}`)}
              >
                <CardContent className="p-4 text-center space-y-3">
                  <div className="relative mx-auto w-fit">
                    <Avatar className="w-16 h-16 border-2 border-primary">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback>{profile.full_name?.charAt(0) || "?"}</AvatarFallback>
                    </Avatar>
                    {profile.is_verified && (
                      <Verified className="absolute -bottom-1 -right-1 w-5 h-5 text-primary fill-primary" />
                    )}
                    <Crown className="absolute -top-2 -right-2 w-5 h-5 text-yellow-500" />
                  </div>
                  
                  <div className="w-full px-1">
                    <h3 className="font-semibold text-sm truncate max-w-full" title={profile.full_name}>{profile.full_name}</h3>
                    <p className="text-xs text-muted-foreground truncate max-w-full" title={`@${profile.username}`}>@{profile.username}</p>
                  </div>

                  {profile.location && (
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{profile.location}</span>
                    </div>
                  )}

                  {profile.user_creative_roles.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1">
                      {profile.user_creative_roles.slice(0, 2).map((r, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {r.role}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="-left-2" />
        <CarouselNext className="-right-2" />
      </Carousel>
    </div>
  );
};
