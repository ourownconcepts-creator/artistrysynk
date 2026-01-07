import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, Activity, TrendingUp } from "lucide-react";

export const DashboardWidgets = () => {
  const [stats, setStats] = useState({
    activeUsers: 0,
    recentSignups: 0,
    totalActivity: 0,
    growthRate: 0
  });

  useEffect(() => {
    fetchStats();

    const channel = supabase
      .channel('dashboard_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles'
      }, () => {
        fetchStats();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_sessions'
      }, () => {
        fetchStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStats = async () => {
    const [profilesRes, sessionsRes, activityRes] = await Promise.all([
      supabase.from('profiles').select('created_at', { count: 'exact' }),
      supabase.from('user_sessions').select('*', { count: 'exact' }).eq('is_active', true),
      supabase.from('activity_logs').select('*', { count: 'exact' })
    ]);

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentSignups = profilesRes.data?.filter(p => 
      new Date(p.created_at) > last24h
    ).length || 0;

    const weeklySignups = profilesRes.data?.filter(p => 
      new Date(p.created_at) > last7days
    ).length || 0;

    setStats({
      activeUsers: sessionsRes.count || 0,
      recentSignups,
      totalActivity: activityRes.count || 0,
      growthRate: weeklySignups
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          <Users className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.activeUsers}</div>
          <p className="text-xs text-muted-foreground mt-1">Currently online</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Recent Signups</CardTitle>
          <UserPlus className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.recentSignups}</div>
          <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Activity</CardTitle>
          <Activity className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalActivity}</div>
          <p className="text-xs text-muted-foreground mt-1">Admin actions logged</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Weekly Growth</CardTitle>
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.growthRate}</div>
          <p className="text-xs text-muted-foreground mt-1">New users this week</p>
        </CardContent>
      </Card>
    </div>
  );
};
