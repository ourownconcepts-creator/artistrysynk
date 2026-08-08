import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Monitor, Smartphone, Globe, LogOut, Clock } from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";

interface Session {
  id: string;
  session_id: string;
  ip_address: string | null;
  user_agent: string | null;
  is_active: boolean | null;
  last_active: string | null;
  created_at: string | null;
}

interface UserSessionsProps {
  userId: string;
}

export const UserSessions = ({ userId }: UserSessionsProps) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
    getCurrentSession();
  }, [userId]);

  const getCurrentSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setCurrentSessionId(session.access_token.substring(0, 20));
    }
  };

  const loadSessions = async () => {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('last_active', { ascending: false });

    if (!error && data) {
      setSessions(data);
    }
    setLoading(false);
  };

  const getDeviceIcon = (userAgent: string | null) => {
    if (!userAgent) return <Globe className="w-4 h-4" />;
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return <Smartphone className="w-4 h-4" />;
    }
    return <Monitor className="w-4 h-4" />;
  };

  const getDeviceInfo = (userAgent: string | null) => {
    if (!userAgent) return 'Unknown Device';
    
    const ua = userAgent.toLowerCase();
    let device = 'Desktop';
    let browser = 'Unknown Browser';
    
    if (ua.includes('mobile')) device = 'Mobile';
    if (ua.includes('tablet')) device = 'Tablet';
    
    if (ua.includes('chrome')) browser = 'Chrome';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('safari')) browser = 'Safari';
    else if (ua.includes('edge')) browser = 'Edge';
    
    return `${device} - ${browser}`;
  };

  const terminateSession = async (sessionId: string) => {
    const { error } = await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('id', sessionId);

    if (error) {
      toast.error('Failed to terminate session');
    } else {
      toast.success('Session terminated');
      loadSessions();
    }
  };

  const terminateAllOtherSessions = async () => {
    const { error } = await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('user_id', userId)
      .neq('session_id', currentSessionId || '');

    if (error) {
      toast.error('Failed to terminate sessions');
    } else {
      toast.success('All other sessions terminated');
      loadSessions();
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading sessions...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              Active Sessions
            </CardTitle>
            <CardDescription>Manage your logged-in devices</CardDescription>
          </div>
          {sessions.length > 1 && (
            <Button variant="outline" size="sm" onClick={terminateAllOtherSessions}>
              <LogOut className="w-4 h-4 mr-2" />
              Log Out Other Devices
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No active sessions found</p>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => {
              const isCurrentSession = session.session_id === currentSessionId;
              
              return (
                <div 
                  key={session.id} 
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-muted rounded-full">
                      {getDeviceIcon(session.user_agent)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{getDeviceInfo(session.user_agent)}</span>
                        {isCurrentSession && (
                          <Badge variant="secondary" className="text-xs">Current</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {session.ip_address || 'Unknown IP'}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        Last active {formatDistanceToNow(new Date(session.last_active))} ago
                      </div>
                    </div>
                  </div>
                  {!isCurrentSession && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => terminateSession(session.id)}
                    >
                      <LogOut className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
