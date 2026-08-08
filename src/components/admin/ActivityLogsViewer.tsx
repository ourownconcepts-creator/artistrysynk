import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Activity } from "lucide-react";

interface ActivityLog {
  id: string;
  action_type: string;
  admin_id: string;
  target_user_id: string | null;
  target_user_name: string | null;
  ip_address: string | null;
  details: any;
  created_at: string | null;
}

export const ActivityLogsViewer = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
    
    // Subscribe to new logs
    const channel = supabase
      .channel('activity_logs_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'activity_logs'
      }, () => {
        fetchLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setLogs(data);
    }
    setLoading(false);
  };

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('delete')) return 'destructive';
    if (action.includes('role_change')) return 'default';
    if (action.includes('login')) return 'secondary';
    return 'outline';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Activity Logs
        </CardTitle>
        <CardDescription>Recent admin actions and system events</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {loading ? (
            <p className="text-muted-foreground">Loading activity logs...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Target User</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge variant={getActionBadgeVariant(log.action_type)}>
                        {log.action_type.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.target_user_name || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.details?.reason || log.details?.from_role || '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(log.created_at!), 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                  </TableRow>
                ))}
                {logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No activity logs found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
