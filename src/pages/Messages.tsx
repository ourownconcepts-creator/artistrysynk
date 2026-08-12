import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeChannel } from "@/hooks/useRealtimeChannel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Send, ArrowLeft, FolderPlus, Flag, MoreVertical, CheckCheck, Check, Clock, AlertCircle, Loader2, User } from "lucide-react";
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
import { ProfilePeekSheet } from "@/components/messages/ProfilePeekSheet";
import { IntroContextBanner } from "@/components/messages/IntroContextBanner";
import { MessageReactions, type Reaction } from "@/components/messages/MessageReactions";
import { VoiceNoteRecorder } from "@/components/messages/VoiceNoteRecorder";
import { VoiceNotePlayer } from "@/components/messages/VoiceNotePlayer";
import { AttachmentPicker } from "@/components/messages/AttachmentPicker";
import { ImageAttachment } from "@/components/messages/ImageAttachment";
import { ChatMediaGallery } from "@/components/messages/ChatMediaGallery";
import { ChatSafetyMenu } from "@/components/messages/ChatSafetyMenu";
import { uploadWithProgress } from "@/lib/uploadWithProgress";
import { UPLOAD_BUCKETS, extensionFor } from "@/config/uploads";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read: boolean;
  status?: "sending" | "sent" | "failed";
  media_url?: string | null;
  media_type?: string | null;
  media_duration_seconds?: number | null;
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
  /**
   * Studio business threads reuse this screen. `"customer"` means you are the
   * creator talking to a studio (the header shows the studio); `"team"` means
   * you are answering on the studio's behalf (the header shows the creator).
   */
  const [studioSide, setStudioSide] = useState<"customer" | "team" | null>(null);
  const [studioHandle, setStudioHandle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [showPeek, setShowPeek] = useState(false);
  const [otherLastSeen, setOtherLastSeen] = useState<string | null>(null);
  const [otherUnreadElsewhere, setOtherUnreadElsewhere] = useState(0);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [otherTyping, setOtherTyping] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const typingSentAt = useRef(0);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 30;

  // `navigate` from the router shim is not referentially stable, so it must stay
  // out of the dep array — including it re-ran this effect on every render, which
  // flipped `loading` back to true and left the page stuck on "Loading conversation".
  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!active) return;
      if (!user) {
        navigate("/auth");
      } else {
        setCurrentUser(user.id);
        void loadCurrentUserProfile(user.id);
        void loadConversation(user.id);
      }
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

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

  // Graceful reconnection: on a transient drop the channel resubscribes with
  // backoff and the conversation is refetched so no message is silently missed.
  const realtimeStatus = useRealtimeChannel({
    name: conversationId && currentUser ? `conversation-${conversationId}` : null,
    onReconnect: () => {
      if (currentUser) loadConversation(currentUser);
    },
    setup: (channel) =>
      channel
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
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'message_reactions' },
          () => {
            void loadReactions();
          }
        )
        .on('broadcast', { event: 'typing' }, ({ payload }) => {
          if (!payload || payload.userId === currentUser) return;
          setOtherTyping(true);
          if (typingTimeout.current) clearTimeout(typingTimeout.current);
          typingTimeout.current = setTimeout(() => setOtherTyping(false), 3000);
        }),
  });

  /** Load reactions for the visible conversation. */
  const loadReactions = async () => {
    if (!messages.length) return;
    const { data } = await supabase
      .from("message_reactions")
      .select("id, message_id, user_id, emoji")
      .in("message_id", messages.filter((m) => !m.id.startsWith("temp-")).map((m) => m.id));
    setReactions((data as Reaction[]) ?? []);
  };

  useEffect(() => {
    void loadReactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  /** Toggle my reaction on a message. */
  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!currentUser) return;
    const mine = reactions.find(
      (r) => r.message_id === messageId && r.user_id === currentUser && r.emoji === emoji,
    );
    if (mine) {
      setReactions((prev) => prev.filter((r) => r.id !== mine.id));
      await supabase.from("message_reactions").delete().eq("id", mine.id);
      return;
    }
    const optimistic: Reaction = { id: `temp-${crypto.randomUUID()}`, message_id: messageId, user_id: currentUser, emoji };
    setReactions((prev) => [...prev, optimistic]);
    const { data, error } = await supabase
      .from("message_reactions")
      .insert({ message_id: messageId, user_id: currentUser, emoji })
      .select("id, message_id, user_id, emoji")
      .single();
    if (error) {
      setReactions((prev) => prev.filter((r) => r.id !== optimistic.id));
      return;
    }
    setReactions((prev) => prev.map((r) => (r.id === optimistic.id ? (data as Reaction) : r)));
  };

  /** Broadcast a throttled typing ping to the other participant. */
  const broadcastTyping = () => {
    if (!conversationId || !currentUser) return;
    const now = Date.now();
    if (now - typingSentAt.current < 1500) return;
    typingSentAt.current = now;
    void supabase
      .channel(`conversation-${conversationId}`)
      .send({ type: "broadcast", event: "typing", payload: { userId: currentUser } });
  };

  /** Upload a recorded voice note and post it as a message. */
  const sendVoiceNote = async (blob: Blob, durationSeconds: number) => {
    if (!currentUser || !conversationId) return;
    const path = `${currentUser}/${conversationId}/${crypto.randomUUID()}.webm`;
    const { error: uploadError } = await supabase.storage
      .from(UPLOAD_BUCKETS.voiceNotes)
      .upload(path, blob, { contentType: blob.type || "audio/webm" });
    if (uploadError) {
      toast.error("Couldn't upload voice note");
      return;
    }
    const { data: inserted, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: currentUser,
        content: "🎤 Voice note",
        media_url: path,
        media_type: "audio",
        media_duration_seconds: durationSeconds,
      })
      .select("*")
      .single();
    if (error || !inserted) {
      toast.error("Couldn't send voice note");
      return;
    }
    setMessages((prev) =>
      prev.some((m) => m.id === inserted.id) ? prev : [...prev, { ...(inserted as Message), status: "sent" }],
    );
    setTimeout(scrollToBottom, 50);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  /** Upload a picked image or audio clip and post it as a message. */
  const sendAttachment = async (file: File, kind: "image" | "audio") => {
    if (!currentUser || !conversationId) return;
    const ext = extensionFor(file, kind === "image" ? "jpg" : "webm");
    const bucket = kind === "image" ? UPLOAD_BUCKETS.chatImages : UPLOAD_BUCKETS.voiceNotes;
    const path = `${currentUser}/${conversationId}/${crypto.randomUUID()}.${ext}`;
    setUploadProgress(0);
    const { error: uploadError } = await uploadWithProgress(bucket, path, file, setUploadProgress);
    if (uploadError) {
      setUploadProgress(null);
      toast.error("Couldn't upload attachment");
      return;
    }
    const { data: inserted, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: currentUser,
        content: kind === "image" ? "🖼️ Photo" : "🎧 Audio clip",
        media_url: path,
        media_type: kind,
      })
      .select("*")
      .single();
    if (error || !inserted) {
      setUploadProgress(null);
      toast.error("Couldn't send attachment");
      return;
    }
    setUploadProgress(null);
    setMessages((prev) =>
      prev.some((m) => m.id === inserted.id) ? prev : [...prev, { ...(inserted as Message), status: "sent" }],
    );
    setTimeout(scrollToBottom, 50);
  };

  /** Live last-seen for the person you're chatting with (polled while tab is visible). */
  useEffect(() => {
    // A studio has no presence row — skip the poll when the header is a studio.
    if (!otherUser?.id || studioSide === "customer") return;
    let active = true;
    const fetchSeen = async () => {
      if (document.visibilityState !== "visible") return;
      const { data } = await supabase
        .from("profiles")
        .select("last_seen_at")
        .eq("id", otherUser.id)
        .maybeSingle();
      if (active) setOtherLastSeen((data?.last_seen_at as string | null) ?? null);
    };
    void fetchSeen();
    const interval = setInterval(fetchSeen, 30_000);
    document.addEventListener("visibilitychange", fetchSeen);
    return () => {
      active = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", fetchSeen);
    };
  }, [otherUser?.id, studioSide]);

  /** Unread messages waiting in your other conversations, shown on the back button. */
  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    const fetchUnread = async () => {
      const { data } = await supabase
        .from("messages")
        .select("conversation_id")
        .eq("read", false)
        .neq("sender_id", currentUser);
      if (!active) return;
      const count = (data ?? []).filter((m) => m.conversation_id !== conversationId).length;
      setOtherUnreadElsewhere(count);
    };
    void fetchUnread();
    const interval = setInterval(fetchUnread, 30_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [currentUser, conversationId, messages.length]);

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
        studio_id,
        customer_id,
        matches(user_id_1, user_id_2)
      `)
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      toast.error("Conversation not found");
      navigate("/matches");
      return;
    }

    if (conversation.studio_id) {
      // Studio business thread: the counterpart depends on which side you're on.
      const viewerIsCustomer = conversation.customer_id === userId;
      setStudioSide(viewerIsCustomer ? "customer" : "team");

      if (viewerIsCustomer) {
        const { data: studio } = await supabase
          .from("studios")
          .select("id, name, handle, logo_url")
          .eq("id", conversation.studio_id)
          .maybeSingle();
        setStudioHandle(studio?.handle ?? null);
        setOtherUser(
          studio
            ? { id: studio.id, full_name: studio.name, username: studio.handle, avatar_url: studio.logo_url }
            : null,
        );
      } else {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .eq("id", conversation.customer_id ?? "")
          .maybeSingle();
        setStudioHandle(null);
        setOtherUser(profile);
      }
    } else {
      setStudioSide(null);
      setStudioHandle(null);
      const match = conversation.matches as any;
      const otherUserId = match.user_id_1 === userId ? match.user_id_2 : match.user_id_1;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .eq('id', otherUserId)
        .single();

      setOtherUser(profile);
    }

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
    // computed below for the header; nothing to derive while loading
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    );
  }

  const seenMs = otherLastSeen ? Date.now() - new Date(otherLastSeen).getTime() : null;
  const otherOnline = seenMs !== null && seenMs < 5 * 60 * 1000;
  const lastSeenLabel =
    seenMs === null
      ? "Offline"
      : `Active ${formatDistanceToNow(new Date(otherLastSeen as string), { addSuffix: true })}`;

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex h-dvh max-w-3xl flex-col">
        <Card className="flex flex-1 flex-col overflow-hidden rounded-none border-0 bg-transparent shadow-none">
          <CardHeader className="app-blur sticky top-0 z-10 border-b border-border/40 py-3">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/messages")}
                  aria-label={
                    otherUnreadElsewhere > 0
                      ? `Back to inbox, ${otherUnreadElsewhere} unread in other chats`
                      : "Back to inbox"
                  }
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                {otherUnreadElsewhere > 0 ? (
                  <span className="pointer-events-none absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground">
                    {otherUnreadElsewhere > 99 ? "99+" : otherUnreadElsewhere}
                  </span>
                ) : null}
              </div>
              
              {otherUser && (
                <div className="flex items-center gap-3 flex-1">
                  <button
                    type="button"
                    onClick={() =>
                      studioSide === "customer"
                        ? navigate(`/studios/${studioHandle ?? ""}`)
                        : setShowPeek(true)
                    }
                    aria-label={
                      studioSide === "customer"
                        ? `View the ${otherUser.full_name} studio page`
                        : `View ${otherUser.full_name}'s profile and portfolio`
                    }
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-1 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Avatar>
                      <AvatarImage src={otherUser.avatar_url ?? undefined} />
                      <AvatarFallback>
                        {otherUser.full_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-lg">{otherUser.full_name}</CardTitle>
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      {studioSide === "customer" ? (
                        <span>Studio</span>
                      ) : otherOnline ? (
                        <span className="flex items-center gap-1 text-emerald-500">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          Online
                        </span>
                      ) : (
                        <span>{lastSeenLabel}</span>
                      )}
                      <span className="truncate">· @{otherUser.username}</span>
                      {realtimeStatus !== "connected" && (
                        <span
                          data-testid="chat-connection-status"
                          className="ml-2 text-xs text-muted-foreground"
                        >
                          {realtimeStatus === "offline" ? "· offline" : "· reconnecting…"}
                        </span>
                      )}
                    </p>
                    </div>
                  </button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      studioSide === "customer"
                        ? navigate(`/studios/${studioHandle ?? ""}`)
                        : setShowPeek(true)
                    }
                    className="hidden sm:inline-flex"
                  >
                    <User className="mr-2 h-4 w-4" />
                    {studioSide === "customer" ? "Studio" : "Profile"}
                  </Button>

                  <ChatMediaGallery messages={messages} name={otherUser.full_name} />

                  {studioSide === null && currentUser && (
                    <ChatSafetyMenu
                      currentUserId={currentUser}
                      targetUserId={otherUser.id}
                      targetUserName={otherUser.full_name}
                      conversationId={conversationId ?? ""}
                      messages={messages.map((m) => ({
                        id: m.id,
                        content: m.content,
                        sender_id: m.sender_id,
                        created_at: m.created_at,
                      }))}
                    />
                  )}

                  {studioSide === null && (
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
                  )}
                </div>
              )}
            </div>
          </CardHeader>

          <IntroContextBanner conversationId={conversationId} />

          <ProfilePeekSheet
            userId={studioSide === "customer" ? null : otherUser?.id ?? null}
            open={showPeek}
            onOpenChange={setShowPeek}
          />

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
                      <AvatarImage src={senderProfile?.avatar_url ?? undefined} />
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
                          className={`rounded-2xl px-3.5 py-2.5 ${
                            isCurrentUser
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          } ${message.status === "failed" ? 'cursor-pointer ring-1 ring-destructive/60' : ''} ${message.status === "sending" ? 'opacity-70' : ''}`}
                        >
                          {message.media_type === "audio" && message.media_url ? (
                            <VoiceNotePlayer
                              path={message.media_url}
                              durationSeconds={message.media_duration_seconds}
                              mine={isCurrentUser}
                            />
                          ) : message.media_type === "image" && message.media_url ? (
                            <ImageAttachment path={message.media_url} alt={`Attachment from ${senderProfile?.full_name ?? "a collaborator"}`} />
                          ) : (
                            <p className="text-sm">{message.content}</p>
                          )}
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
                      {!message.id.startsWith("temp-") && (
                        <MessageReactions
                          reactions={reactions.filter((r) => r.message_id === message.id)}
                          currentUserId={currentUser}
                          align={isCurrentUser ? "end" : "start"}
                          onToggle={(emoji) => void toggleReaction(message.id, emoji)}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {otherTyping && (
              <div className="flex justify-start" aria-live="polite">
                <div className="flex items-center gap-1.5 rounded-2xl bg-muted px-3 py-2">
                  <span className="sr-only">{otherUser?.full_name} is typing</span>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      style={{ animationDelay: `${i * 150}ms` }}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground"
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          <div className="app-blur border-t border-border/40 p-3 pb-[max(0.75rem,var(--safe-area-bottom))]">
            <form onSubmit={sendMessage} className="relative flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  broadcastTyping();
                }}
                placeholder="Message..."
                className="flex-1 rounded-full bg-surface-2 border-0"
              />
              <AttachmentPicker onPick={sendAttachment} disabled={!currentUser} progress={uploadProgress} />
              <VoiceNoteRecorder onRecorded={sendVoiceNote} disabled={!currentUser} />
              <Button type="submit" variant="hero" disabled={!newMessage.trim()} aria-label="Send message">
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
