import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Heart, TrendingUp } from "lucide-react";
import { ExportData } from "./ExportData";

interface Match {
  id: string;
  user_id_1: string;
  user_id_2: string;
  matched_at: string;
  user1_name?: string;
  user2_name?: string;
}

export const MatchManagement = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMatches: 0,
    todayMatches: 0,
    weeklyGrowth: 0
  });

  useEffect(() => {
    fetchMatches();
    
    const channel = supabase
      .channel('matches_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'matches'
      }, () => {
        fetchMatches();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMatches = async () => {
    const { data: matchesData, error } = await supabase
      .from('matches')
      .select(`
        *,
        user1:profiles!matches_user_id_1_fkey(full_name),
        user2:profiles!matches_user_id_2_fkey(full_name)
      `)
      .order('matched_at', { ascending: false })
      .limit(50);

    if (!error && matchesData) {
      const formattedMatches = matchesData.map((m: any) => ({
        id: m.id,
        user_id_1: m.user_id_1,
        user_id_2: m.user_id_2,
        matched_at: m.matched_at,
        user1_name: m.user1?.full_name || 'Unknown',
        user2_name: m.user2?.full_name || 'Unknown'
      }));
      setMatches(formattedMatches);

      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayMatches = formattedMatches.filter(m => 
        new Date(m.matched_at) >= today
      ).length;

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const thisWeek = formattedMatches.filter(m => 
        new Date(m.matched_at) >= weekAgo
      ).length;
      
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const lastWeek = formattedMatches.filter(m => {
        const date = new Date(m.matched_at);
        return date >= twoWeeksAgo && date < weekAgo;
      }).length;

      const growth = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek * 100) : 0;

      setStats({
        totalMatches: formattedMatches.length,
        todayMatches,
        weeklyGrowth: Math.round(growth)
      });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Matches</CardTitle>
            <Heart className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMatches}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today's Matches</CardTitle>
            <Heart className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayMatches}</div>
            <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Weekly Growth</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.weeklyGrowth > 0 ? '+' : ''}{stats.weeklyGrowth}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">vs last week</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5" />
                Match History
              </CardTitle>
              <CardDescription>Recent user matches and connections</CardDescription>
            </div>
            <ExportData dataType="analytics" />
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {loading ? (
              <p className="text-muted-foreground">Loading matches...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User 1</TableHead>
                    <TableHead>User 2</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matches.map((match) => (
                    <TableRow key={match.id}>
                      <TableCell className="font-medium">{match.user1_name}</TableCell>
                      <TableCell className="font-medium">{match.user2_name}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(match.matched_at), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">Active</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {matches.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No matches found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};