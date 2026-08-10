import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MessageSquare, Eye, Trash2, Flag, CheckCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ConversationWithMessages {
  id: string;
  match_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  message_count: number;
  last_message: string | null;
  last_message_at: string | null;
  participants: { id: string; name: string }[];
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_name?: string;
  created_at: string | null;
  read: boolean | null;
}

export const MessagesModeration = () => {
  const [conversations, setConversations] = useState<ConversationWithMessages[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    setLoading(true);
    
    // Fetch all conversations
    const { data: conversationsData, error: convError } = await supabase
      .from("conversations")
      .select("*")
      .order("updated_at", { ascending: false });

    if (convError) {
      toast.error("Failed to fetch conversations");
      setLoading(false);
      return;
    }

    if (!conversationsData || conversationsData.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    // Fetch messages for each conversation
    const { data: allMessages } = await supabase
      .from("messages")
      .select("conversation_id, content, created_at, sender_id");

    // Fetch matches to get participant info
    const matchIds = conversationsData
      .map(c => c.match_id)
      .filter((id): id is string => Boolean(id));
    const { data: matches } = await supabase
      .from("matches")
      .select("id, user_id_1, user_id_2")
      .in("id", matchIds);

    // Get all user profiles
    const userIds = new Set<string>();
    matches?.forEach(m => {
      userIds.add(m.user_id_1);
      userIds.add(m.user_id_2);
    });
    
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", Array.from(userIds));

    const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
    const matchMap = new Map(matches?.map(m => [m.id, m]) || []);

    const enrichedConversations = conversationsData.map(conv => {
      const convMessages = allMessages?.filter(m => m.conversation_id === conv.id) || [];
      const sortedMessages = convMessages.sort((a, b) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
      
      const match = conv.match_id ? matchMap.get(conv.match_id) : undefined;
      const participants = match ? [
        { id: match.user_id_1, name: profileMap.get(match.user_id_1) || "Unknown" },
        { id: match.user_id_2, name: profileMap.get(match.user_id_2) || "Unknown" }
      ] : [];

      return {
        ...conv,
        message_count: convMessages.length,
        last_message: sortedMessages[0]?.content || null,
        last_message_at: sortedMessages[0]?.created_at || null,
        participants
      };
    });

    setConversations(enrichedConversations);
    setLoading(false);
  };

  const fetchMessages = async (conversationId: string) => {
    setMessagesLoading(true);
    setSelectedConversation(conversationId);

    const { data: messagesData, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Failed to fetch messages");
      setMessagesLoading(false);
      return;
    }

    // Get sender names
    const senderIds = [...new Set(messagesData?.map(m => m.sender_id) || [])];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", senderIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

    const enrichedMessages = messagesData?.map(msg => ({
      ...msg,
      sender_name: profileMap.get(msg.sender_id) || "Unknown"
    })) || [];

    setMessages(enrichedMessages);
    setMessagesLoading(false);
  };

  const deleteMessage = async (messageId: string) => {
    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("id", messageId);

    if (error) {
      toast.error("Failed to delete message");
      return;
    }

    toast.success("Message deleted");
    if (selectedConversation) {
      fetchMessages(selectedConversation);
    }
    fetchConversations();
  };

  const deleteConversation = async (conversationId: string) => {
    // Delete all messages first
    await supabase
      .from("messages")
      .delete()
      .eq("conversation_id", conversationId);

    // Then delete the conversation
    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", conversationId);

    if (error) {
      toast.error("Failed to delete conversation");
      return;
    }

    toast.success("Conversation deleted");
    setSelectedConversation(null);
    setMessages([]);
    fetchConversations();
  };

  const filteredConversations = conversations.filter(conv => {
    const participantNames = conv.participants.map(p => p.name.toLowerCase()).join(" ");
    const lastMessage = conv.last_message?.toLowerCase() || "";
    return participantNames.includes(searchTerm.toLowerCase()) || 
           lastMessage.includes(searchTerm.toLowerCase());
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Messages Moderation
        </CardTitle>
        <CardDescription>Review and moderate user conversations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input
            placeholder="Search by participant name or message content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading conversations...</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Conversations List */}
            <div className="border rounded-lg">
              <div className="p-3 border-b bg-muted/50">
                <h3 className="font-semibold">Conversations ({filteredConversations.length})</h3>
              </div>
              <ScrollArea className="h-[500px]">
                {filteredConversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedConversation === conv.id ? "bg-muted" : ""
                    }`}
                    onClick={() => fetchMessages(conv.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          {conv.participants.map(p => p.name).join(" & ")}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.last_message || "No messages"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <Badge variant="secondary" className="text-xs">
                          {conv.message_count} msgs
                        </Badge>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" onClick={(e) => e.stopPropagation()}>
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will delete the entire conversation and all messages. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteConversation(conv.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    {conv.last_message_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(conv.last_message_at), "MMM dd, yyyy HH:mm")}
                      </p>
                    )}
                  </div>
                ))}
                {filteredConversations.length === 0 && (
                  <div className="p-4 text-center text-muted-foreground">
                    No conversations found
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Messages View */}
            <div className="border rounded-lg">
              <div className="p-3 border-b bg-muted/50">
                <h3 className="font-semibold">Messages</h3>
              </div>
              <ScrollArea className="h-[500px]">
                {messagesLoading ? (
                  <div className="p-4 text-center text-muted-foreground">Loading messages...</div>
                ) : selectedConversation ? (
                  messages.length > 0 ? (
                    <div className="p-2 space-y-2">
                      {messages.map((msg) => (
                        <div key={msg.id} className="p-3 border rounded-lg bg-card">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="text-xs font-medium text-primary">{msg.sender_name}</p>
                              <p className="text-sm mt-1">{msg.content}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {msg.created_at ? format(new Date(msg.created_at), "MMM dd, yyyy HH:mm") : ""}
                              </p>
                            </div>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost">
                                  <Trash2 className="w-3 h-3 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Message</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this message?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteMessage(msg.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">
                      No messages in this conversation
                    </div>
                  )
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    Select a conversation to view messages
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
