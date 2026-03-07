import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface UserSession {
  id: string;
  user_id: string;
  session_id: string;
  ip_address: string;
  user_agent: string;
  last_active: string;
  is_active: boolean;
  profiles: { full_name: string; username: string };
}

export const SessionManagement = () => {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();

    const channel = supabase
      .channel('sessions_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_sessions'
      }, () => {
        fetchSessions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSessions = async () => {
    const { data: sessionsData, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('is_active', true)
      .order('last_active', { ascending: false });

    if (!error && sessionsData && sessionsData.length > 0) {
      const userIds = [...new Set(sessionsData.map(s => s.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .in('id', userIds);

      const profileMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      const merged = sessionsData.map(s => ({
        ...s,
        profiles: profileMap.get(s.user_id) || { full_name: 'Unknown', username: 'unknown' }
      }));
      setSessions(merged as any);
    } else {
      setSessions([]);
    }
    setLoading(false);
  };

  const handleForceLogout = async (sessionId: string, userId: string) => {
    const { error } = await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('id', sessionId);

    if (error) {
      toast.error("Failed to terminate session");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('activity_logs').insert({
        admin_id: user.id,
        action_type: 'session_terminated',
        target_user_id: userId,
        details: { session_id: sessionId }
      });
    }

    toast.success("Session terminated successfully");
    fetchSessions();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Active User Sessions
        </CardTitle>
        <CardDescription>Monitor and manage active user sessions</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Loading sessions...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{session.profiles?.full_name}</div>
                      <div className="text-sm text-muted-foreground">@{session.profiles?.username}</div>
                    </div>
                  </TableCell>
                  <TableCell>{session.ip_address || "N/A"}</TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(session.last_active), 'MMM dd, yyyy HH:mm')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="default">Active</Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleForceLogout(session.id, session.user_id)}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Force Logout
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {sessions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No active sessions found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
