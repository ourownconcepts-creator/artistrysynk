import { useCallback, useEffect, useState } from "react";
import { Link } from "@/lib/router-compat";
import { toast } from "sonner";
import { Loader2, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { can, fetchStudioThreads, type StudioRole, type StudioThread } from "@/lib/studios";

type Props = {
  studioId: string;
  userId?: string;
  role: StudioRole | null;
  studioActive: boolean;
  permissions?: Record<string, unknown> | null;
};

/**
 * Studio business inbox. These are ordinary `conversations` rows with a
 * `studio_id`, so they reuse the existing chat screen, realtime channel and
 * notification fan-out — no second messaging system.
 */
export function StudioInboxPanel({ studioId, userId, role, studioActive, permissions }: Props) {
  const [threads, setThreads] = useState<StudioThread[]>([]);
  const [loading, setLoading] = useState(true);

  const canInbox = can(role, "manage_inbox", { permissions, studioActive });

  const load = useCallback(async () => {
    if (!canInbox || !userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setThreads(await fetchStudioThreads(studioId, userId));
    } catch {
      toast.error("Could not load the studio inbox");
    } finally {
      setLoading(false);
    }
  }, [canInbox, studioId, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!canInbox) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inbox</CardTitle>
          <CardDescription>
            {studioActive
              ? "Your studio role does not include inbox access."
              : "The inbox is locked while the studio is inactive."}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" /> Studio inbox
        </CardTitle>
        <CardDescription>Business enquiries sent to this studio by creators.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : threads.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No enquiries yet.</p>
        ) : (
          threads.map((thread) => (
            <div key={thread.id} className="flex items-center gap-3 rounded-lg border p-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={thread.customer?.avatar_url ?? undefined} />
                <AvatarFallback>{(thread.customer?.full_name ?? "?").charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{thread.customer?.full_name ?? "Creator"}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {thread.updated_at ? new Date(thread.updated_at).toLocaleString() : ""}
                </p>
              </div>
              {thread.unread > 0 && <Badge variant="destructive">{thread.unread}</Badge>}
              <Button size="sm" variant="outline" asChild>
                <Link to={`/messages/${thread.id}`}>Open</Link>
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
