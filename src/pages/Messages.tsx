import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Send, ArrowLeft, FolderPlus, Flag, MoreVertical, CheckCheck, Check, Clock, AlertCircle, Loader2 } from "lucide-react";
import { FlagContentDialog } from "@/components/FlagContentDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read: boolean;
  status?: "sending" | "sent" | "failed";
}

interface OtherUser {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
}

const Messages = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<OtherUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 30;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setCurrentUser(user.id);
        loadCurrentUserProfile(user.id);
        loadConversation(user.id);
      }
    });
  }, [navigate, conversationId]);

  // Mark messages as read when viewing conversation
  useEffect(() => {
    if (!conversationId || !currentUser || messages.length === 0) return;

    const unreadIds = messages
      .filter(m => m.sender_id !== currentUser && !m.read)
      .map(m => m.id);

    if (unreadIds.length > 0) {
      supabase
        .from('messages')
        .update({ read: true })
        .in('id', unreadIds)
        .then();
    }
  }, [messages, currentUser, conversationId]);

  useEffect(() => {
    if (!conversationId || !currentUser) return;

    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const incoming = payload.new as Message;
          setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
          scrollToBottom();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, ...updated, status: "sent" } : m))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUser]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadCurrentUserProfile = async (userId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .eq('id', userId)
      .single();
    setCurrentUserProfile(profile);
  };

  const loadConversation = async (userId: string) => {
    if (!conversationId) {
      navigate("/matches");
      return;
    }
    setLoading(true);

    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select(`
        id,
        match_id,
        matches(user_id_1, user_id_2)
      `)
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      toast.error("Conversation not found");
      navigate("/matches");
      return;
    }

    const match = conversation.matches as any;
    const otherUserId = match.user_id_1 === userId ? match.user_id_2 : match.user_id_1;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .eq('id', otherUserId)
      .single();

    setOtherUser(profile);

    const { data: messagesData } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    const ordered = (messagesData || []).slice().reverse();
    setMessages(
      ordered.map((m) => ({
        ...m,
        created_at: m.created_at ?? new Date().toISOString(),
        read: m.read ?? false,
        status: "sent" as const,
      }))
    );
    setHasMore((messagesData || []).length === PAGE_SIZE);
    setLoading(false);
    setTimeout(scrollToBottom, 100);
  };

  const loadOlderMessages = async () => {
    if (loadingOlder || !hasMore || messages.length === 0 || !conversationId) return;
    setLoadingOlder(true);
    const container = scrollContainerRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;
    const oldestCreatedAt = messages[0].created_at;

    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .lt('created_at', oldestCreatedAt)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    const older = (data || []).slice().reverse().map((m) => ({
      ...m,
      created_at: m.created_at ?? new Date().toISOString(),
      read: m.read ?? false,
      status: "sent" as const,
    }));
    if (older.length > 0) {
      setMessages((prev) => [...older, ...prev]);
      // preserve scroll position after prepending
      requestAnimationFrame(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = newScrollHeight - prevScrollHeight;
        }
      });
    }
    setHasMore((data || []).length === PAGE_SIZE);
    setLoadingOlder(false);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop < 80) {
      loadOlderMessages();
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !currentUser || !conversationId) return;

    const content = newMessage.trim();
    const tempId = `temp-${crypto.randomUUID()}`;
    const optimistic: Message = {
      id: tempId,
      sender_id: currentUser,
      content,
      created_at: new Date().toISOString(),
      read: false,
      status: "sending",
    };
    setMessages((prev) => [...prev, optimistic]);
    setNewMessage("");
    setTimeout(scrollToBottom, 50);

    const { data: inserted, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: currentUser,
        content,
      })
      .select('*')
      .single();

    if (error || !inserted) {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m))
      );
      toast.error("Failed to send message. Tap to retry.");
      return;
    }

    setMessages((prev) => {
      const withoutTemp = prev.filter((m) => m.id !== tempId);
      if (withoutTemp.some((m) => m.id === inserted.id)) return withoutTemp;
      return [...withoutTemp, { ...(inserted as Message), status: "sent" }];
    });
  };

  const retryMessage = async (msg: Message) => {
    if (!currentUser || !conversationId || msg.status !== "failed") return;
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, status: "sending" } : m)));
    const { data: inserted, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: currentUser,
        content: msg.content,
      })
      .select('*')
      .single();
    if (error || !inserted) {
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, status: "failed" } : m)));
      toast.error("Still failed to send");
      return;
    }
    setMessages((prev) => {
      const withoutTemp = prev.filter((m) => m.id !== msg.id);
      if (withoutTemp.some((m) => m.id === inserted.id)) return withoutTemp;
      return [...withoutTemp, { ...(inserted as Message), status: "sent" }];
    });
  };

  const createProject = async () => {
    if (!projectTitle.trim() || !currentUser || !otherUser) return;

    setCreatingProject(true);

    try {
      // Create the project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          title: projectTitle.trim(),
          description: projectDescription.trim() || null,
          created_by: currentUser,
          status: 'active',
        })
        .select('id')
        .single();

      if (projectError) throw projectError;

      // Add the other user as a project member
      const { error: memberError } = await supabase
        .from('project_members')
        .insert({
          project_id: project.id,
          user_id: otherUser.id,
          role: 'collaborator',
        });

      if (memberError) throw memberError;

      toast.success("Project created!", {
        description: "You can now collaborate together.",
        action: {
          label: "View Project",
          onClick: () => navigate(`/projects/${project.id}`),
        },
      });

      setShowProjectDialog(false);
      setProjectTitle("");
      setProjectDescription("");
    } catch (error) {
      toast.error("Failed to create project");
    } finally {
      setCreatingProject(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-secondary/5">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      <div className="max-w-4xl mx-auto h-screen flex flex-col">
        <Card className="flex-1 flex flex-col m-4">
          <CardHeader className="border-b">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/matches")}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              
              {otherUser && (
                <div className="flex items-center gap-3 flex-1">
                  <Avatar>
                    <AvatarImage src={otherUser.avatar_url} />
                    <AvatarFallback>
                      {otherUser.full_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{otherUser.full_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">@{otherUser.username}</p>
                  </div>
                  
                  <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <FolderPlus className="w-4 h-4 mr-2" />
                        Start Collaboration
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create a Project</DialogTitle>
                        <DialogDescription>
                          Start a collaboration project with {otherUser.full_name}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Project Title</label>
                          <Input
                            placeholder="e.g., New Music Video"
                            value={projectTitle}
                            onChange={(e) => setProjectTitle(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Description (optional)</label>
                          <Textarea
                            placeholder="What's this project about?"
                            value={projectDescription}
                            onChange={(e) => setProjectDescription(e.target.value)}
                            rows={3}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowProjectDialog(false)}>
                          Cancel
                        </Button>
                        <Button 
                          variant="hero" 
                          onClick={createProject}
                          disabled={!projectTitle.trim() || creatingProject}
                        >
                          {creatingProject ? "Creating..." : "Create Project"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            {loadingOlder && (
              <div className="flex justify-center py-2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {!hasMore && messages.length > 0 && (
              <p className="text-center text-xs text-muted-foreground py-2">
                Beginning of conversation
              </p>
            )}
            {messages.map((message) => {
              const isCurrentUser = message.sender_id === currentUser;
              const senderProfile = isCurrentUser ? currentUserProfile : otherUser;
              return (
                <div
                  key={message.id}
                  className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start gap-2 max-w-[70%] ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                    <Avatar className="w-8 h-8 mt-1 shrink-0">
                      <AvatarImage src={senderProfile?.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {senderProfile?.full_name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className={`text-xs font-medium mb-1 ${isCurrentUser ? 'text-right' : 'text-left'} text-muted-foreground`}>
                        {senderProfile?.full_name || 'Unknown'}{' '}
                        <span className="font-normal">@{senderProfile?.username || 'unknown'}</span>
                      </p>
                      <div className={`flex items-start gap-1 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                        <div
                          onClick={() => message.status === "failed" && retryMessage(message)}
                          className={`rounded-lg p-3 ${
                            isCurrentUser
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          } ${message.status === "failed" ? 'cursor-pointer ring-1 ring-destructive/60' : ''} ${message.status === "sending" ? 'opacity-70' : ''}`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <div className={`flex items-center gap-1 mt-1 ${isCurrentUser ? 'justify-end' : ''}`}>
                            <p className={`text-xs ${
                              isCurrentUser
                                ? 'text-primary-foreground/70'
                                : 'text-muted-foreground'
                            }`}>
                              {new Date(message.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                            {isCurrentUser && (
                              <span className="flex items-center" title={
                                message.status === "sending" ? "Sending..." :
                                message.status === "failed" ? "Failed — tap to retry" :
                                message.read ? "Seen" : "Delivered"
                              }>
                                {message.status === "sending" ? (
                                  <Clock className="w-3.5 h-3.5 text-primary-foreground/60 animate-pulse" />
                                ) : message.status === "failed" ? (
                                  <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                                ) : message.read ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-primary-foreground" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-primary-foreground/60" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                        {!isCurrentUser && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:opacity-100">
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <FlagContentDialog
                                contentType="message"
                                contentId={message.id}
                                trigger={
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <Flag className="h-4 w-4 mr-2 text-destructive" />
                                    Report Message
                                  </DropdownMenuItem>
                                }
                              />
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </CardContent>

          <div className="p-4 border-t">
            <form onSubmit={sendMessage} className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1"
              />
              <Button type="submit" variant="hero">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Messages;
