import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MessageCircle, Users, Heart, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useSubscription } from "@/hooks/useSubscription";
import { CollaborationRequestDialog } from "@/components/collaboration/CollaborationRequestDialog";
import { getRoleLabel } from "@/lib/creativeRoles";

interface Match {
  id: string;
  matched_at: string;
  profile: {
    id: string;
    full_name: string;
    username: string;
    avatar_url: string;
    bio: string;
    user_creative_roles: { role: string }[];
  };
  conversation_id: string;
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
    read: boolean;
  };
  unread_count: number;
}

const Matches = () => {
  const navigate = useNavigate();
  const { canSeeWhoLikedYou } = useSubscription();
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [likesCount, setLikesCount] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setCurrentUser(user.id);
        loadMatches(user.id);
        loadLikesCount(user.id);
      }
    });
  }, [navigate]);

  const loadLikesCount = async (userId: string) => {
    // Get users who liked you but you haven't swiped on
    const { data: yourSwipes } = await supabase
      .from("swipes")
      .select("swiped_id")
      .eq("swiper_id", userId);

    const swipedIds = yourSwipes?.map((s) => s.swiped_id) || [];

    const { count } = await supabase
      .from("swipes")
      .select("*", { count: "exact", head: true })
      .eq("swiped_id", userId)
      .eq("liked", true)
      .not("swiper_id", "in", `(${[userId, ...swipedIds].join(",")})`);

    setLikesCount(count || 0);
  };

  const loadMatches = async (userId: string) => {
    setLoading(true);

    const { data, error } = await supabase
      .from('matches')
      .select(`
        id,
        matched_at,
        user_id_1,
        user_id_2,
        conversations(id)
      `)
      .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
      .order('matched_at', { ascending: false });

    if (error) {
      toast.error("Failed to load matches");
      setLoading(false);
      return;
    }

    const matchesWithProfiles = await Promise.all(
      (data || []).map(async (match) => {
        const otherUserId = match.user_id_1 === userId ? match.user_id_2 : match.user_id_1;
        
      const { data: profile } = await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            username,
            avatar_url,
            bio,
            user_creative_roles(role)
          `)
          .eq('id', otherUserId)
          .single();

        const conversationId = match.conversations[0]?.id;
        let last_message = undefined;
        let unread_count = 0;

        if (conversationId) {
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content, created_at, sender_id, read')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (lastMsg) {
            last_message = lastMsg;
          }

          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conversationId)
            .neq('sender_id', userId)
            .eq('read', false);

          unread_count = count || 0;
        }

        return {
          id: match.id,
          matched_at: match.matched_at,
          profile: profile!,
          conversation_id: conversationId,
          last_message,
          unread_count,
        };
      })
    );

    setMatches(matchesWithProfiles);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-secondary/5">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading your matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-4">
      <div className="max-w-4xl mx-auto py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Your Matches
            </h1>
            <p className="text-muted-foreground">
              {matches.length} {matches.length === 1 ? 'match' : 'matches'}
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/discover")}>
            Keep Discovering
          </Button>
        </div>
        
        {/* Who Liked You Card */}
        <Card 
          className="mb-6 cursor-pointer hover:shadow-lg transition-shadow-sm border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5"
          onClick={() => navigate("/who-liked-you")}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">See Who Liked You</h3>
                  <p className="text-sm text-muted-foreground">
                    {likesCount > 0 ? `${likesCount} people liked your profile` : "No new likes yet"}
                  </p>
                </div>
              </div>
              {!canSeeWhoLikedYou && (
                <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600">
                  Pro Feature
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {matches.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <Users className="w-12 h-12 mx-auto text-muted-foreground" />
              <div>
                <h2 className="text-xl font-semibold mb-2">No matches yet</h2>
                <p className="text-muted-foreground">
                  Start swiping to find your creative collaborators!
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {matches.map((match) => (
              <Card
                key={match.id}
                className="cursor-pointer hover:shadow-lg transition-shadow-sm relative"
                onClick={() => navigate(`/messages/${match.conversation_id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={match.profile.avatar_url} />
                      <AvatarFallback>
                        {match.profile.full_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {match.profile.full_name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            @{match.profile.username}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <MessageCircle className="w-5 h-5 text-muted-foreground" />
                          <CollaborationRequestDialog
                            matchId={match.id}
                            recipientId={match.profile.id}
                            recipientName={match.profile.full_name}
                            currentUserId={currentUser!}
                          />
                        </div>
                      </div>

                      {match.profile.user_creative_roles.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {match.profile.user_creative_roles.map((r, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {getRoleLabel(r.role)}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {match.last_message ? (
                        <div className="flex items-center gap-1 mt-1">
                          {match.last_message.sender_id === currentUser && (
                            <CheckCheck className={`w-3.5 h-3.5 shrink-0 ${match.last_message.read ? 'text-primary' : 'text-muted-foreground'}`} />
                          )}
                          <p className={`text-sm line-clamp-1 ${match.unread_count > 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                            {match.last_message.content}
                          </p>
                          <span className="text-xs text-muted-foreground whitespace-nowrap ml-auto">
                            {formatDistanceToNow(new Date(match.last_message.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      ) : match.profile.bio ? (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {match.profile.bio}
                        </p>
                      ) : null}
                      {match.unread_count > 0 && (
                        <Badge className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 absolute top-4 right-4">
                          {match.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Matches;
