import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Send, ArrowLeft, FolderPlus } from "lucide-react";
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
}

interface OtherUser {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string;
}

const Messages = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setCurrentUser(user.id);
        loadConversation(user.id);
      }
    });
  }, [navigate, conversationId]);

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
          setMessages((prev) => [...prev, payload.new as Message]);
          scrollToBottom();
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

  const loadConversation = async (userId: string) => {
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
      .order('created_at', { ascending: true });

    setMessages(messagesData || []);
    setLoading(false);
    setTimeout(scrollToBottom, 100);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !currentUser) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: currentUser,
        content: newMessage.trim(),
      });

    if (error) {
      toast.error("Failed to send message");
    } else {
      setNewMessage("");
    }
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

          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender_id === currentUser ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    message.sender_id === currentUser
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.sender_id === currentUser
                      ? 'text-primary-foreground/70'
                      : 'text-muted-foreground'
                  }`}>
                    {new Date(message.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}
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
