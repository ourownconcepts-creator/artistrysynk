import { useState, useEffect } from "react";
import { useParams, useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Play, Pause, Send, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  media_type: string;
  media_url: string;
  user_id: string;
  profiles: {
    full_name: string;
    username: string;
    avatar_url: string;
  };
}

interface Feedback {
  id: string;
  content: string;
  timestamp_seconds: number | null;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url: string;
  };
}

const Studio = () => {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<PortfolioItem | null>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [newFeedback, setNewFeedback] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setCurrentUser(user.id);
        loadItem();
      }
    });
  }, [itemId, navigate]);

  useEffect(() => {
    if (!itemId) return;

    const channel = supabase
      .channel(`studio-${itemId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "studio_feedback",
          filter: `portfolio_item_id=eq.${itemId}`,
        },
        () => loadFeedback()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [itemId]);

  const loadItem = async () => {
    const { data, error } = await supabase
      .from("portfolio_items")
      .select(`
        *,
        profiles:user_id(full_name, username, avatar_url)
      `)
      .eq("id", itemId)
      .single();

    if (error || !data) {
      toast.error("Item not found");
      navigate(-1);
      return;
    }

    setItem(data as any);
    loadFeedback();
    setLoading(false);
  };

  const loadFeedback = async () => {
    const { data } = await supabase
      .from("studio_feedback")
      .select(`
        *,
        profiles:user_id(full_name, avatar_url)
      `)
      .eq("portfolio_item_id", itemId)
      .order("created_at", { ascending: true });

    setFeedback((data as any) || []);
  };

  const submitFeedback = async () => {
    if (!newFeedback.trim() || !currentUser) return;

    const { error } = await supabase.from("studio_feedback").insert({
      portfolio_item_id: itemId,
      user_id: currentUser,
      content: newFeedback.trim(),
      timestamp_seconds: item?.media_type === "audio" || item?.media_type === "video" 
        ? currentTime 
        : null,
    });

    if (error) {
      toast.error("Failed to submit feedback");
    } else {
      setNewFeedback("");
      toast.success("Feedback submitted");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!item) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      <div className="max-w-6xl mx-auto p-4 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-0">
                <div className="aspect-video bg-black relative">
                  {item.media_type === "video" && (
                    <video
                      src={item.media_url}
                      className="w-full h-full"
                      controls
                      onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                    />
                  )}
                  {item.media_type === "audio" && (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8">
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-6">
                        {isPlaying ? (
                          <Pause className="w-12 h-12 text-white" />
                        ) : (
                          <Play className="w-12 h-12 text-white ml-2" />
                        )}
                      </div>
                      <audio
                        src={item.media_url}
                        controls
                        className="w-full max-w-md"
                        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                      />
                    </div>
                  )}
                  {item.media_type === "image" && (
                    <img
                      src={item.media_url}
                      alt={item.title}
                      className="w-full h-full object-contain"
                    />
                  )}
                  {item.media_type === "document" && (
                    <iframe
                      src={item.media_url}
                      className="w-full h-full"
                      title={item.title}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar>
                    <AvatarImage src={item.profiles.avatar_url} />
                    <AvatarFallback>{item.profiles.full_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold">{item.title}</h1>
                    <p className="text-muted-foreground">
                      by {item.profiles.full_name} (@{item.profiles.username})
                    </p>
                    {item.description && (
                      <p className="mt-4 text-sm">{item.description}</p>
                    )}
                    <Badge className="mt-3">{item.media_type}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Feedback Thread
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-h-96 overflow-y-auto space-y-4">
                  {feedback.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No feedback yet. Be the first to comment!
                    </p>
                  ) : (
                    feedback.map((fb) => (
                      <div key={fb.id} className="flex gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={fb.profiles?.avatar_url} />
                          <AvatarFallback>{fb.profiles?.full_name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 bg-muted rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{fb.profiles?.full_name}</span>
                            {fb.timestamp_seconds !== null && (
                              <Badge variant="outline" className="text-xs">
                                @ {formatTime(fb.timestamp_seconds)}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm">{fb.content}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(fb.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-4 border-t space-y-3">
                  {(item.media_type === "audio" || item.media_type === "video") && (
                    <p className="text-xs text-muted-foreground">
                      Feedback at: {formatTime(currentTime)}
                    </p>
                  )}
                  <Textarea
                    value={newFeedback}
                    onChange={(e) => setNewFeedback(e.target.value)}
                    placeholder="Add your feedback..."
                    rows={3}
                  />
                  <Button onClick={submitFeedback} disabled={!newFeedback.trim()} className="w-full">
                    <Send className="w-4 h-4 mr-2" />
                    Submit Feedback
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Studio;
