import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, ArrowLeft, Verified, Heart, Flag } from "lucide-react";
import { PortfolioGrid } from "@/components/portfolio/PortfolioGrid";
import { toast } from "sonner";
import { ProfileSchema, PageSEO } from "@/components/seo";
import { FlagContentDialog } from "@/components/FlagContentDialog";
import { BlockUserButton } from "@/components/settings/BlockUserButton";

const PublicProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [genres, setGenres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });

    if (userId) {
      loadProfile(userId);
    }
  }, [userId]);

  const loadProfile = async (identifier: string) => {
    setLoading(true);

    // Check if identifier is a UUID or username
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    
    let profileData;
    if (isUUID) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", identifier)
        .maybeSingle();
      profileData = data;
    } else {
      // Try to find by username
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", identifier)
        .maybeSingle();
      profileData = data;
    }

    if (!profileData) {
      toast.error("Profile not found");
      navigate("/discover");
      return;
    }

    const { data: rolesData } = await supabase
      .from("user_creative_roles")
      .select("role")
      .eq("user_id", id);

    const { data: genresData } = await supabase
      .from("user_genres")
      .select("genre")
      .eq("user_id", id);

    setProfile(profileData);
    setRoles(rolesData || []);
    setGenres(genresData || []);
    setLoading(false);
  };

  const handleLike = async () => {
    if (!currentUserId || !userId) {
      toast.error("Please sign in to like profiles");
      return;
    }

    if (currentUserId === userId) {
      toast.error("You can't like your own profile");
      return;
    }

    const { error } = await supabase.from("swipes").insert({
      swiper_id: currentUserId,
      swiped_id: userId,
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

    toast.success(`You liked ${profile?.full_name}!`);
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

  if (!profile) {
    return null;
  }

  const profileUrl = `https://artistrysynk.com/profile/${profile.username || userId}`;

  return (
    <>
      <PageSEO
        title={`${profile.full_name} (@${profile.username}) | Artistry.ng`}
        description={profile.bio || `Check out ${profile.full_name}'s creative profile on Artistry.ng. ${roles.length > 0 ? `Roles: ${roles.map(r => r.role).join(', ')}.` : ''}`}
        keywords={`${profile.full_name}, ${profile.username}, ${roles.map(r => r.role).join(', ')}, Nigerian creative, Artistry.ng`}
        ogImage={profile.avatar_url || 'https://artistrysynk.com/og-image.png'}
        ogType="profile"
        canonicalUrl={profileUrl}
      />
      <ProfileSchema
        name={profile.full_name}
        username={profile.username}
        description={profile.bio}
        image={profile.avatar_url}
        url={profileUrl}
        jobTitles={roles.map(r => r.role)}
        location={profile.location}
        sameAs={profile.social_links ? Object.values(profile.social_links as Record<string, string>).filter(Boolean) : []}
      />
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-4">
      <div className="max-w-4xl mx-auto py-8">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card className="mb-6">
          {profile.cover_image_url && (
            <div className="h-48 w-full overflow-hidden rounded-t-lg">
              <img
                src={profile.cover_image_url}
                alt="Cover"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <CardHeader className="text-center relative">
            <div className={`flex justify-center ${profile.cover_image_url ? "-mt-16" : ""}`}>
              <Avatar className="w-32 h-32 border-4 border-background shadow-lg">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="text-4xl bg-secondary/20">
                  {profile.full_name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex items-center justify-center gap-2 mt-4">
              <CardTitle className="text-3xl">{profile.full_name}</CardTitle>
              {profile.is_verified && (
                <Verified className="w-6 h-6 text-primary fill-primary/20" />
              )}
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
                <h3 className="font-semibold mb-3">Creative Roles</h3>
                <div className="flex flex-wrap justify-center gap-2">
                  {roles.map((r, i) => (
                    <Badge key={i} variant="secondary" className="text-sm px-3 py-1">
                      {r.role}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {genres.length > 0 && (
              <div className="text-center">
                <h3 className="font-semibold mb-3">Genres</h3>
                <div className="flex flex-wrap justify-center gap-2">
                  {genres.map((g, i) => (
                    <Badge key={i} variant="outline" className="text-sm px-3 py-1">
                      {g.genre}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {profile.bio && (
              <div className="text-center max-w-xl mx-auto">
                <h3 className="font-semibold mb-3">About</h3>
                <p className="text-muted-foreground">{profile.bio}</p>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              Joined {new Date(profile.created_at).toLocaleDateString()}
            </div>

            {currentUserId && currentUserId !== userId && (
              <div className="flex justify-center gap-3 pt-4">
                <Button onClick={handleLike} className="gap-2">
                  <Heart className="w-5 h-5" />
                  Like Profile
                </Button>
                <FlagContentDialog
                  contentType="profile"
                  contentId={userId!}
                  trigger={
                    <Button variant="outline" size="icon" className="text-muted-foreground hover:text-destructive">
                      <Flag className="w-5 h-5" />
                    </Button>
                  }
                />
                <BlockUserButton
                  userId={currentUserId}
                  targetUserId={userId!}
                  targetUserName={profile.full_name}
                  onBlocked={() => navigate("/discover")}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Portfolio Section */}
        <Card>
          <CardHeader>
            <CardTitle>Portfolio</CardTitle>
          </CardHeader>
          <CardContent>
            <PortfolioGrid userId={userId!} showReportButton={currentUserId !== null && currentUserId !== userId} />
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
};

export default PublicProfile;
