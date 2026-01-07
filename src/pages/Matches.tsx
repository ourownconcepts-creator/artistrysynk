import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MessageCircle, Users } from "lucide-react";

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
}

const Matches = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setCurrentUser(user.id);
        loadMatches(user.id);
      }
    });
  }, [navigate]);

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

        return {
          id: match.id,
          matched_at: match.matched_at,
          profile: profile!,
          conversation_id: match.conversations[0]?.id,
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
                className="cursor-pointer hover:shadow-lg transition-shadow"
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
                        <MessageCircle className="w-5 h-5 text-muted-foreground" />
                      </div>

                      {match.profile.user_creative_roles.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {match.profile.user_creative_roles.map((r, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {r.role}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {match.profile.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {match.profile.bio}
                        </p>
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
