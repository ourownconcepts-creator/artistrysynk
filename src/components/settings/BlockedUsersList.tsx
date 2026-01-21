import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { UserX, Loader2 } from "lucide-react";

interface BlockedUser {
  id: string;
  blocked_id: string;
  created_at: string;
  profile?: {
    full_name: string;
    avatar_url: string | null;
    username: string;
  };
}

interface BlockedUsersListProps {
  userId: string;
}

export const BlockedUsersList = ({ userId }: BlockedUsersListProps) => {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  useEffect(() => {
    loadBlockedUsers();
  }, [userId]);

  const loadBlockedUsers = async () => {
    const { data, error } = await supabase
      .from("blocked_users")
      .select("id, blocked_id, created_at")
      .eq("blocker_id", userId);

    if (error) {
      toast.error("Failed to load blocked users");
      setLoading(false);
      return;
    }

    // Fetch profiles for blocked users
    if (data && data.length > 0) {
      const blockedIds = data.map(b => b.blocked_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, username")
        .in("id", blockedIds);

      const enrichedData = data.map(block => ({
        ...block,
        profile: profiles?.find(p => p.id === block.blocked_id),
      }));

      setBlockedUsers(enrichedData);
    } else {
      setBlockedUsers([]);
    }
    setLoading(false);
  };

  const handleUnblock = async (blockId: string, userName: string) => {
    setUnblocking(blockId);
    const { error } = await supabase
      .from("blocked_users")
      .delete()
      .eq("id", blockId);

    if (error) {
      toast.error("Failed to unblock user");
    } else {
      toast.success(`${userName} has been unblocked`);
      setBlockedUsers(prev => prev.filter(b => b.id !== blockId));
    }
    setUnblocking(null);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserX className="w-5 h-5" />
          Blocked Users
        </CardTitle>
        <CardDescription>
          Users you've blocked won't be able to see your profile or message you
        </CardDescription>
      </CardHeader>
      <CardContent>
        {blockedUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            You haven't blocked anyone yet
          </p>
        ) : (
          <div className="space-y-3">
            {blockedUsers.map((block) => (
              <div
                key={block.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={block.profile?.avatar_url || undefined} />
                    <AvatarFallback>
                      {block.profile?.full_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{block.profile?.full_name || "Unknown User"}</p>
                    <p className="text-sm text-muted-foreground">
                      @{block.profile?.username || "unknown"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUnblock(block.id, block.profile?.full_name || "User")}
                  disabled={unblocking === block.id}
                >
                  {unblocking === block.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Unblock"
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
