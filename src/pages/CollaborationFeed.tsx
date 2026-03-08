import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Heart, MessageCircle, Bookmark, Send, Hash, Users, Plus, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { allRoles, getRoleLabel } from "@/lib/creativeRoles";

interface FeedPost {
  id: string;
  user_id: string;
  content: string;
  hashtags: string[];
  role_tags: string[];
  created_at: string;
  profile?: {
    full_name: string;
    username: string;
    avatar_url: string;
    is_verified: boolean;
  };
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  is_saved: boolean;
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: {
    full_name: string;
    username: string;
    avatar_url: string;
  };
}

const CollaborationFeed = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [selectedRoleTags, setSelectedRoleTags] = useState<string[]>([]);
  const [showComments, setShowComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [showRolePicker, setShowRolePicker] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setCurrentUser(user.id);
        loadPosts(user.id);
      }
    });
  }, [navigate]);

  const loadPosts = async (userId: string) => {
    const { data: postsData, error } = await supabase
      .from("collaboration_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error loading posts:", error);
      setLoading(false);
      return;
    }

    const userIds = [...new Set((postsData || []).map(p => p.user_id))];
    const postIds = (postsData || []).map(p => p.id);

    const [profilesRes, likesRes, savesRes, likeCountsRes, commentCountsRes] = await Promise.all([
      userIds.length > 0
        ? supabase.from("profiles").select("id, full_name, username, avatar_url, is_verified").in("id", userIds)
        : { data: [] },
      postIds.length > 0
        ? supabase.from("collaboration_post_likes").select("post_id").eq("user_id", userId).in("post_id", postIds)
        : { data: [] },
      postIds.length > 0
        ? supabase.from("collaboration_post_saves").select("post_id").eq("user_id", userId).in("post_id", postIds)
        : { data: [] },
      postIds.length > 0
        ? supabase.from("collaboration_post_likes").select("post_id").in("post_id", postIds)
        : { data: [] },
      postIds.length > 0
        ? supabase.from("collaboration_post_comments").select("post_id").in("post_id", postIds)
        : { data: [] },
    ]);

    const profileMap = Object.fromEntries((profilesRes.data || []).map(p => [p.id, p]));
    const likedSet = new Set((likesRes.data || []).map(l => l.post_id));
    const savedSet = new Set((savesRes.data || []).map(s => s.post_id));
    
    const likeCounts: Record<string, number> = {};
    (likeCountsRes.data || []).forEach(l => { likeCounts[l.post_id] = (likeCounts[l.post_id] || 0) + 1; });
    
    const commentCounts: Record<string, number> = {};
    (commentCountsRes.data || []).forEach(c => { commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1; });

    const enriched: FeedPost[] = (postsData || []).map(p => ({
      ...p,
      hashtags: p.hashtags || [],
      role_tags: p.role_tags || [],
      profile: profileMap[p.user_id] as any,
      likes_count: likeCounts[p.id] || 0,
      comments_count: commentCounts[p.id] || 0,
      is_liked: likedSet.has(p.id),
      is_saved: savedSet.has(p.id),
    }));

    setPosts(enriched);
    setLoading(false);
  };

  const createPost = async () => {
    if (!newContent.trim() || !currentUser) return;
    setPosting(true);

    const hashtags = newContent.match(/#\w+/g)?.map(h => h.slice(1)) || [];

    const { error } = await supabase.from("collaboration_posts").insert({
      user_id: currentUser,
      content: newContent,
      hashtags,
      role_tags: selectedRoleTags,
    });

    if (error) {
      toast.error("Failed to create post");
    } else {
      toast.success("Post published!");
      setNewContent("");
      setSelectedRoleTags([]);
      loadPosts(currentUser);
    }
    setPosting(false);
  };

  const toggleLike = async (postId: string, isLiked: boolean) => {
    if (!currentUser) return;
    if (isLiked) {
      await supabase.from("collaboration_post_likes").delete().eq("post_id", postId).eq("user_id", currentUser);
    } else {
      await supabase.from("collaboration_post_likes").insert({ post_id: postId, user_id: currentUser });
    }
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_liked: !isLiked, likes_count: p.likes_count + (isLiked ? -1 : 1) } : p));
  };

  const toggleSave = async (postId: string, isSaved: boolean) => {
    if (!currentUser) return;
    if (isSaved) {
      await supabase.from("collaboration_post_saves").delete().eq("post_id", postId).eq("user_id", currentUser);
    } else {
      await supabase.from("collaboration_post_saves").insert({ post_id: postId, user_id: currentUser });
    }
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_saved: !isSaved } : p));
  };

  const loadComments = async (postId: string) => {
    if (showComments === postId) {
      setShowComments(null);
      return;
    }
    const { data } = await supabase.from("collaboration_post_comments").select("*").eq("post_id", postId).order("created_at", { ascending: true });
    
    const userIds = [...new Set((data || []).map(c => c.user_id))];
    const { data: profiles } = userIds.length > 0
      ? await supabase.from("profiles").select("id, full_name, username, avatar_url").in("id", userIds)
      : { data: [] };
    
    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
    setComments((data || []).map(c => ({ ...c, profile: profileMap[c.user_id] as any })));
    setShowComments(postId);
  };

  const addComment = async (postId: string) => {
    if (!newComment.trim() || !currentUser) return;
    const { error } = await supabase.from("collaboration_post_comments").insert({
      post_id: postId,
      user_id: currentUser,
      content: newComment,
    });
    if (error) {
      toast.error("Failed to add comment");
    } else {
      setNewComment("");
      loadComments(postId);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p));
    }
  };

  const toggleRoleTag = (role: string) => {
    setSelectedRoleTags(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
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
      <div className="max-w-2xl mx-auto py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Collaboration Feed
          </h1>
          <p className="text-muted-foreground">Post what you're working on and find collaborators</p>
        </div>

        {/* Create Post */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Textarea
              placeholder="Looking for a vocalist for an Afro-fusion track… Need a React developer for a music platform… #collab #music"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={3}
              className="resize-none"
            />
            {selectedRoleTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedRoleTags.map(tag => (
                  <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => toggleRoleTag(tag)}>
                    {getRoleLabel(tag)} ✕
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowRolePicker(!showRolePicker)}>
                  <Users className="w-4 h-4 mr-1" /> Tag Roles
                </Button>
              </div>
              <Button onClick={createPost} disabled={!newContent.trim() || posting} size="sm">
                {posting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
                Post
              </Button>
            </div>
            {showRolePicker && (
              <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto p-2 border rounded-lg bg-muted/50">
                {allRoles.slice(0, 30).map(role => (
                  <Badge
                    key={role.value}
                    variant={selectedRoleTags.includes(role.value) ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleRoleTag(role.value)}
                  >
                    {role.label}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feed */}
        {posts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Hash className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">No posts yet</h2>
              <p className="text-muted-foreground">Be the first to post a collaboration request!</p>
            </CardContent>
          </Card>
        ) : (
          posts.map(post => (
            <Card key={post.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <Avatar
                    className="cursor-pointer"
                    onClick={() => navigate(`/profile/${post.user_id}`)}
                  >
                    <AvatarImage src={post.profile?.avatar_url} />
                    <AvatarFallback>{post.profile?.full_name?.charAt(0) || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold text-sm cursor-pointer hover:underline" onClick={() => navigate(`/profile/${post.user_id}`)}>
                      {post.profile?.full_name || "Unknown"}
                      {post.profile?.is_verified && <span className="ml-1 text-primary">✓</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      @{post.profile?.username} · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <p className="text-sm whitespace-pre-wrap">
                  {post.content.split(/(#\w+)/g).map((part, i) =>
                    part.startsWith("#") ? (
                      <span key={i} className="text-primary font-medium">{part}</span>
                    ) : (
                      <span key={i}>{part}</span>
                    )
                  )}
                </p>
                {post.role_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {post.role_tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {getRoleLabel(tag)}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-2 flex flex-col gap-3">
                <div className="flex items-center gap-4 w-full">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={post.is_liked ? "text-red-500" : "text-muted-foreground"}
                    onClick={() => toggleLike(post.id, post.is_liked)}
                  >
                    <Heart className={`w-4 h-4 mr-1 ${post.is_liked ? "fill-current" : ""}`} />
                    {post.likes_count || ""}
                  </Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => loadComments(post.id)}>
                    <MessageCircle className="w-4 h-4 mr-1" />
                    {post.comments_count || ""}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={post.is_saved ? "text-primary" : "text-muted-foreground"}
                    onClick={() => toggleSave(post.id, post.is_saved)}
                  >
                    <Bookmark className={`w-4 h-4 ${post.is_saved ? "fill-current" : ""}`} />
                  </Button>
                </div>

                {/* Comments Section */}
                {showComments === post.id && (
                  <div className="w-full space-y-3 border-t pt-3">
                    {comments.map(comment => (
                      <div key={comment.id} className="flex gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={comment.profile?.avatar_url} />
                          <AvatarFallback className="text-xs">{comment.profile?.full_name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-xs">
                            <span className="font-medium">{comment.profile?.full_name}</span>{" "}
                            <span className="text-muted-foreground">{comment.content}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addComment(post.id)}
                        className="text-sm h-8"
                      />
                      <Button size="sm" variant="ghost" onClick={() => addComment(post.id)} disabled={!newComment.trim()}>
                        <Send className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default CollaborationFeed;
