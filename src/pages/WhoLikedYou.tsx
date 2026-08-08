import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Heart, Lock, Crown, MapPin } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

interface LikedProfile {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string;
  bio: string;
  location: string;
  user_creative_roles: { role: string }[];
  liked_at: string;
}

const WhoLikedYou = () => {
  const navigate = useNavigate();
  const { canSeeWhoLikedYou, loading: subLoading } = useSubscription();
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [likedProfiles, setLikedProfiles] = useState<LikedProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setCurrentUser(user.id);
        if (canSeeWhoLikedYou) {
          loadLikes(user.id);
        } else {
          setLoading(false);
        }
      }
    });
  }, [navigate, canSeeWhoLikedYou]);

  const loadLikes = async (userId: string) => {
    setLoading(true);

    // Get users who liked you but you haven't swiped on yet
    const { data: yourSwipes } = await supabase
      .from("swipes")
      .select("swiped_id")
      .eq("swiper_id", userId);

    const swipedIds = yourSwipes?.map((s) => s.swiped_id) || [];

    const { data: likes, error } = await supabase
      .from("swipes")
      .select("swiper_id, created_at")
      .eq("swiped_id", userId)
      .eq("liked", true);

    if (error) {
      toast.error("Failed to load likes");
      setLoading(false);
      return;
    }

    // Filter out users you've already swiped on
    const unseenLikes = likes?.filter((l) => !swipedIds.includes(l.swiper_id)) || [];

    // Load profiles for these users
    const profiles = await Promise.all(
      unseenLikes.map(async (like) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select(`
            id,
            full_name,
            username,
            avatar_url,
            bio,
            location,
            user_creative_roles(role)
          `)
          .eq("id", like.swiper_id)
          .single();

        return {
          ...profile!,
          liked_at: like.created_at,
        };
      })
    );

    setLikedProfiles(profiles.filter(Boolean) as LikedProfile[]);
    setLoading(false);
  };

  const handleLikeBack = async (profileId: string) => {
    if (!currentUser) return;

    const { error } = await supabase.from("swipes").insert({
      swiper_id: currentUser,
      swiped_id: profileId,
      liked: true,
    });

    if (error) {
      toast.error("Failed to like back");
      return;
    }

    toast.success("🎉 It's a match!", {
      description: "You can now start chatting!",
    });

    setLikedProfiles((prev) => prev.filter((p) => p.id !== profileId));
  };

  if (loading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-secondary/5">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!canSeeWhoLikedYou) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-4">
        <div className="max-w-md mx-auto py-16 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-4">See Who Liked You</h1>
          <p className="text-muted-foreground mb-8">
            Upgrade to Pro to see who's interested in collaborating with you!
          </p>
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 justify-center mb-4">
                <Crown className="w-8 h-8 text-yellow-500" />
                <span className="text-2xl font-bold">Pro Features</span>
              </div>
              <ul className="text-left space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-primary" />
                  See who liked you
                </li>
                <li className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-primary" />
                  Unlimited rewinds
                </li>
                <li className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-primary" />
                  Priority profile visibility
                </li>
              </ul>
            </CardContent>
          </Card>
          <Button variant="hero" size="lg" onClick={() => navigate("/pricing")}>
            Upgrade to Pro
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-4">
      <div className="max-w-4xl mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent flex items-center gap-2">
            <Heart className="w-8 h-8 text-primary" />
            Who Liked You
          </h1>
          <p className="text-muted-foreground">
            {likedProfiles.length} {likedProfiles.length === 1 ? "person has" : "people have"} liked your profile
          </p>
        </div>

        {likedProfiles.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <Heart className="w-12 h-12 mx-auto text-muted-foreground" />
              <div>
                <h2 className="text-xl font-semibold mb-2">No new likes yet</h2>
                <p className="text-muted-foreground">
                  Keep your profile updated to attract more creatives!
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {likedProfiles.map((profile) => (
              <Card key={profile.id} className="overflow-hidden hover:shadow-lg transition-shadow-sm">
                <div className="aspect-square bg-gradient-to-br from-primary/20 to-secondary/20 relative">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Avatar className="w-20 h-20">
                        <AvatarFallback className="text-2xl">
                          {profile.full_name?.charAt(0) ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <Badge variant="secondary" className="bg-primary/90 text-white">
                      <Heart className="w-3 h-3 mr-1 fill-current" />
                      Liked you
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold">{profile.full_name}</h3>
                    <p className="text-sm text-muted-foreground">@{profile.username}</p>
                  </div>
                  
                  {profile.location && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {profile.location}
                    </div>
                  )}

                  {profile.user_creative_roles?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {profile.user_creative_roles.slice(0, 2).map((r, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {r.role}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <Button
                    variant="hero"
                    className="w-full"
                    onClick={() => handleLikeBack(profile.id)}
                  >
                    <Heart className="w-4 h-4 mr-2" />
                    Like Back
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WhoLikedYou;
