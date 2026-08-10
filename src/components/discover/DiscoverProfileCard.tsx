import { useState, useEffect, useRef } from "react";
import { useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart, X, RotateCcw, Crown, MapPin, Zap, BadgeCheck, Sparkles, Music, Users, Play, Pause, ChevronUp } from "lucide-react";
import { getRoleLabel } from "@/lib/creativeRoles";
import { motion, AnimatePresence } from "framer-motion";
import { TrustSignals, VerifiedBadge } from "@/components/trust/TrustSignals";

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
  last_seen_at?: string | null;
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
  const [expanded, setExpanded] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    loadExtras(profile.id);
    setExpanded(false);
    setIsAudioPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [profile.id]);

  const loadExtras = async (profileId: string) => {
    const { data: items } = await supabase
      .from("portfolio_items")
      .select("id, title, media_url, media_type, thumbnail_url")
      .eq("user_id", profileId)
      .eq("is_hidden", false)
      .limit(5);

    if (items) {
      setPortfolioItems(items);
      setAudioItem(items.find(i => i.media_type === "audio") || null);
    }

    // Mutual connections
    const [{ data: myMatches }, { data: theirMatches }] = await Promise.all([
      supabase.from("matches").select("user_id_1, user_id_2")
        .or(`user_id_1.eq.${currentUserId},user_id_2.eq.${currentUserId}`),
      supabase.from("matches").select("user_id_1, user_id_2")
        .or(`user_id_1.eq.${profileId},user_id_2.eq.${profileId}`),
    ]);

    if (myMatches && theirMatches) {
      const mySet = new Set(myMatches.map(m => m.user_id_1 === currentUserId ? m.user_id_2 : m.user_id_1));
      const count = theirMatches.filter(m => {
        const otherId = m.user_id_1 === profileId ? m.user_id_2 : m.user_id_1;
        return mySet.has(otherId);
      }).length;
      setMutualCount(count);
    }
  };

  const toggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isAudioPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsAudioPlaying(!isAudioPlaying);
  };

  const imageItems = portfolioItems.filter(i => i.media_type === "image" || i.thumbnail_url);

  return (
    <motion.div
      key={profile.id}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="relative rounded-2xl overflow-hidden shadow-xl border border-border aspect-[3/4] max-h-[75vh] bg-card"
    >
      {/* Full-bleed image */}
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={() => navigate(`/profile/${profile.id}`)}
      >
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.full_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/30 to-secondary/30">
            <Avatar className="w-32 h-32">
              <AvatarFallback className="text-5xl font-bold text-primary bg-primary/10">
                {profile.full_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>

      {/* Trust badges - top right */}
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        {profile.is_verified && (
          <div className="bg-background/70 backdrop-blur-md rounded-full p-2 shadow-md" title="Verified">
            <BadgeCheck className="w-5 h-5 text-emerald-500" />
          </div>
        )}
        {profile.is_featured && (
          <div className="bg-background/70 backdrop-blur-md rounded-full p-2 shadow-md" title="Featured">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
        )}
      </div>

      {/* Synergy badge - top left */}
      {profile.synergyScore && profile.synergyScore > 0 && (
        <div className="absolute top-4 left-4 z-10">
          <div className="flex items-center gap-1.5 bg-accent/90 backdrop-blur-md text-accent-foreground px-3 py-1.5 rounded-full shadow-md text-sm font-bold">
            <Zap className="w-4 h-4" />
            {profile.synergyScore}%
          </div>
        </div>
      )}

      {/* Audio mini-player - top center */}
      {audioItem && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <button
            onClick={toggleAudio}
            className="flex items-center gap-2 bg-background/70 backdrop-blur-md rounded-full px-3 py-1.5 shadow-md hover:bg-background/90 transition-colors"
          >
            {isAudioPlaying ? (
              <Pause className="w-4 h-4 text-primary" />
            ) : (
              <Play className="w-4 h-4 text-primary" />
            )}
            <span className="text-xs font-medium truncate max-w-[120px]">{audioItem.title}</span>
          </button>
          <audio
            ref={audioRef}
            src={audioItem.media_url}
            onEnded={() => setIsAudioPlaying(false)}
            preload="none"
          />
        </div>
      )}

      {/* Gradient overlay - bottom */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none"
        style={{ height: expanded ? '75%' : '50%' }}
      />

      {/* Bottom overlay content */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-5 flex flex-col gap-3">
        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="self-center mb-1"
        >
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronUp className="w-5 h-5 text-white/70 hover:text-white transition-colors" />
          </motion.div>
        </button>

        {/* Name & username */}
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-1.5 drop-shadow-lg" title={profile.full_name}>
            {profile.full_name}
            {profile.is_verified && <VerifiedBadge className="w-5 h-5 text-emerald-400" />}
          </h2>
          <TrustSignals
            className="mt-1.5"
            tone="onImage"
            isVerified={profile.is_verified}
            isFeatured={profile.is_featured}
            lastSeenAt={profile.last_seen_at}
          />
          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-white/70 text-sm">@{profile.username}</p>
            {profile.location && (
              <span className="flex items-center gap-1 text-white/60 text-xs">
                <MapPin className="w-3 h-3" />
                {profile.location}
              </span>
            )}
            {mutualCount > 0 && (
              <span className="flex items-center gap-1 text-accent text-xs font-medium">
                <Users className="w-3 h-3" />
                {mutualCount} mutual
              </span>
            )}
          </div>
        </div>

        {/* Roles */}
        {profile.user_creative_roles.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {profile.user_creative_roles.slice(0, 3).map((r, i) => (
              <Badge key={i} className="bg-white/15 text-white border-white/20 backdrop-blur-xs text-xs hover:bg-white/25">
                {getRoleLabel(r.role)}
              </Badge>
            ))}
            {profile.user_creative_roles.length > 3 && (
              <Badge className="bg-white/10 text-white/70 border-white/10 text-xs">
                +{profile.user_creative_roles.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Match reason */}
        {profile.matchReason && (
          <p className="text-xs text-white/70 italic">"{profile.matchReason}"</p>
        )}

        {/* Expanded content */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden space-y-3"
            >
              {/* Genres */}
              {profile.user_genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {profile.user_genres.map((g, i) => (
                    <Badge key={i} variant="outline" className="border-white/20 text-white/80 text-xs">
                      {g.genre}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Bio */}
              {profile.bio && (
                <p className="text-sm text-white/80 line-clamp-3">{profile.bio}</p>
              )}

              {/* Portfolio thumbnails */}
              {imageItems.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {imageItems.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      className="w-14 h-14 rounded-lg overflow-hidden border border-white/20 shrink-0 cursor-pointer hover:border-white/50 transition-colors"
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
                      className="w-14 h-14 rounded-lg border border-white/20 shrink-0 flex items-center justify-center text-xs text-white/60 cursor-pointer hover:border-white/50 transition-colors"
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-4 pt-1">
          <Button
            size="lg"
            className="h-14 w-14 rounded-full bg-white/15 backdrop-blur-md border border-white/20 hover:bg-destructive/80 hover:border-destructive/50 transition-all shadow-lg"
            onClick={() => onSwipe(false)}
            disabled={isTransitioning}
            aria-label={`Pass on ${profile.full_name}`}
          >
            <X className="w-7 h-7 text-white" />
          </Button>
          <Button
            size="icon"
            className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-md border border-white/15 hover:bg-white/20 transition-all relative"
            onClick={onRewind}
            disabled={!hasLastSwipe || isTransitioning}
            title={canRewind ? "Undo last swipe" : "Pro feature"}
            aria-label="Undo last swipe"
          >
            <RotateCcw className="w-4 h-4 text-white/80" />
            {!canRewind && <Crown className="w-3 h-3 absolute -top-1 -right-1 text-amber-400" />}
          </Button>
          <Button
            size="lg"
            className="h-14 w-14 rounded-full bg-primary/80 backdrop-blur-md border border-primary/50 hover:bg-primary transition-all shadow-lg shadow-primary/30"
            onClick={() => onSwipe(true)}
            disabled={isTransitioning}
            aria-label={`Like ${profile.full_name}`}
          >
            <Heart className="w-7 h-7 text-white" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
