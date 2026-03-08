import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, X, RotateCcw, Crown, MapPin, Zap, BadgeCheck, Sparkles, User, Music, Users } from "lucide-react";
import { getRoleLabel } from "@/lib/creativeRoles";

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

interface DiscoverProfileCardProps {
  profile: Profile;
  currentUserId: string;
  onSwipe: (liked: boolean) => void;
  onRewind: () => void;
  canRewind: boolean;
  hasLastSwipe: boolean;
  isTransitioning: boolean;
}

export const DiscoverProfileCard = ({
  profile,
  currentUserId,
  onSwipe,
  onRewind,
  canRewind,
  hasLastSwipe,
  isTransitioning,
}: DiscoverProfileCardProps) => {
  const navigate = useNavigate();
  const [portfolioItems, setPortfolioItems] = useState<any[]>([]);
  const [audioItem, setAudioItem] = useState<any>(null);
  const [mutualCount, setMutualCount] = useState(0);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  useEffect(() => {
    loadExtras(profile.id);
  }, [profile.id]);

  const loadExtras = async (profileId: string) => {
    // Load portfolio thumbnails + audio
    const { data: items } = await supabase
      .from("portfolio_items")
      .select("id, title, media_url, media_type, thumbnail_url")
      .eq("user_id", profileId)
      .eq("is_hidden", false)
      .limit(5);

    if (items) {
      setPortfolioItems(items);
      const audio = items.find(i => i.media_type === "audio");
      setAudioItem(audio || null);
    }

    // Load mutual connections (shared matches)
    const { data: myMatches } = await supabase
      .from("matches")
      .select("user_id_1, user_id_2")
      .or(`user_id_1.eq.${currentUserId},user_id_2.eq.${currentUserId}`);

    const { data: theirMatches } = await supabase
      .from("matches")
      .select("user_id_1, user_id_2")
      .or(`user_id_1.eq.${profileId},user_id_2.eq.${profileId}`);

    if (myMatches && theirMatches) {
      const myConnections = new Set(
        myMatches.map(m => m.user_id_1 === currentUserId ? m.user_id_2 : m.user_id_1)
      );
      const theirConnections = theirMatches.map(m =>
        m.user_id_1 === profileId ? m.user_id_2 : m.user_id_1
      );
      const mutual = theirConnections.filter(id => myConnections.has(id));
      setMutualCount(mutual.length);
    }
  };

  const imageItems = portfolioItems.filter(i => i.media_type === "image" || i.thumbnail_url);

  return (
    <div className="rounded-xl overflow-hidden border border-border bg-card shadow-lg animate-fade-in">
      {/* Split layout: image left, info right on md+; stacked on mobile */}
      <div className="flex flex-col md:flex-row min-h-[420px]">
        {/* Left: Image */}
        <div
          className="relative md:w-1/2 w-full aspect-square md:aspect-auto cursor-pointer group"
          onClick={() => navigate(`/profile/${profile.id}`)}
        >
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
              <Avatar className="w-28 h-28">
                <AvatarFallback className="text-5xl font-bold bg-primary/10 text-primary">
                  {profile.full_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </div>
          )}

          {/* Gradient overlay at bottom of image */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />

          {/* Trust badges top-right */}
          <div className="absolute top-3 right-3 flex gap-1.5">
            {profile.is_verified && (
              <div className="bg-background/80 backdrop-blur-sm rounded-full p-1.5" title="Verified Creator">
                <BadgeCheck className="w-5 h-5 text-emerald-500" />
              </div>
            )}
            {profile.is_featured && (
              <div className="bg-background/80 backdrop-blur-sm rounded-full p-1.5" title="Featured Creator">
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
            )}
          </div>

          {/* Name overlay on image (mobile) */}
          <div className="absolute bottom-3 left-3 md:hidden">
            <h2 className="text-xl font-bold text-white flex items-center gap-1.5 drop-shadow-lg" title={profile.full_name}>
              {profile.full_name}
              {profile.is_verified && <BadgeCheck className="w-4 h-4 text-emerald-400 shrink-0" />}
            </h2>
            <p className="text-white/80 text-sm drop-shadow-lg">@{profile.username}</p>
          </div>
        </div>

        {/* Right: Info */}
        <div className="md:w-1/2 w-full p-5 flex flex-col justify-between gap-4">
          {/* Header - hidden on mobile (shown on image) */}
          <div className="space-y-3">
            <div className="hidden md:block">
              <h2 className="text-2xl font-bold flex items-center gap-1.5 truncate" title={profile.full_name}>
                {profile.full_name}
                {profile.is_verified && <BadgeCheck className="w-5 h-5 text-emerald-500 shrink-0" />}
              </h2>
              <p className="text-muted-foreground truncate" title={`@${profile.username}`}>@{profile.username}</p>
            </div>

            {/* Location & mutual connections */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {profile.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {profile.location}
                </span>
              )}
              {mutualCount > 0 && (
                <span className="flex items-center gap-1 text-primary font-medium">
                  <Users className="w-3.5 h-3.5" />
                  {mutualCount} mutual
                </span>
              )}
            </div>

            {/* Synergy / Compatibility tag */}
            {profile.synergyScore && profile.synergyScore > 0 ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20 w-fit">
                <Zap className="w-4 h-4 text-accent" />
                <span className="text-sm font-semibold text-accent">{profile.synergyScore}% Synergy</span>
              </div>
            ) : profile.matchReason ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/10 border border-secondary/20 w-fit">
                <Sparkles className="w-3.5 h-3.5 text-secondary" />
                <span className="text-xs text-secondary font-medium">{profile.matchReason}</span>
              </div>
            ) : null}

            {/* Creative Roles */}
            {profile.user_creative_roles.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {profile.user_creative_roles.slice(0, 3).map((r, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {getRoleLabel(r.role)}
                  </Badge>
                ))}
                {profile.user_creative_roles.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{profile.user_creative_roles.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Genres */}
            {profile.user_genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {profile.user_genres.slice(0, 3).map((g, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {g.genre}
                  </Badge>
                ))}
                {profile.user_genres.length > 3 && (
                  <Badge variant="outline" className="text-xs opacity-60">
                    +{profile.user_genres.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Bio */}
            {profile.bio && (
              <p className="text-sm text-muted-foreground line-clamp-2">{profile.bio}</p>
            )}

            {/* Audio preview */}
            {audioItem && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    const audioEl = document.getElementById(`audio-${profile.id}`) as HTMLAudioElement;
                    if (audioEl) {
                      if (isAudioPlaying) {
                        audioEl.pause();
                      } else {
                        audioEl.play();
                      }
                      setIsAudioPlaying(!isAudioPlaying);
                    }
                  }}
                >
                  <Music className="w-4 h-4 text-primary" />
                </Button>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{audioItem.title}</p>
                  <p className="text-[10px] text-muted-foreground">Tap to {isAudioPlaying ? "pause" : "preview"}</p>
                </div>
                <audio
                  id={`audio-${profile.id}`}
                  src={audioItem.media_url}
                  onEnded={() => setIsAudioPlaying(false)}
                  preload="none"
                />
              </div>
            )}

            {/* Portfolio thumbnails */}
            {imageItems.length > 0 && (
              <div className="flex gap-1.5 overflow-hidden">
                {imageItems.slice(0, 4).map((item, i) => (
                  <div
                    key={item.id}
                    className="w-12 h-12 rounded-md overflow-hidden border border-border shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/profile/${profile.id}`);
                    }}
                  >
                    <img
                      src={item.thumbnail_url || item.media_url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
                {portfolioItems.length > 4 && (
                  <div
                    className="w-12 h-12 rounded-md border border-border shrink-0 flex items-center justify-center bg-muted/50 text-xs text-muted-foreground cursor-pointer hover:bg-muted transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/profile/${profile.id}`);
                    }}
                  >
                    +{portfolioItems.length - 4}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="outline"
              size="lg"
              className="flex-1 border-destructive/30 hover:bg-destructive/10 hover:text-destructive transition-colors"
              onClick={() => onSwipe(false)}
              disabled={isTransitioning}
            >
              <X className="w-6 h-6" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="relative h-11 w-11"
              onClick={onRewind}
              disabled={!hasLastSwipe || isTransitioning}
              title={canRewind ? "Undo last swipe" : "Pro feature"}
            >
              <RotateCcw className="w-5 h-5" />
              {!canRewind && <Crown className="w-3 h-3 absolute -top-1 -right-1 text-amber-400" />}
            </Button>
            <Button
              variant="hero"
              size="lg"
              className="flex-1"
              onClick={() => onSwipe(true)}
              disabled={isTransitioning}
            >
              <Heart className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
