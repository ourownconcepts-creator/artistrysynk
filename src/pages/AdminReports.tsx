import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download, Send, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExportData } from "@/components/admin/ExportData";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { cn } from "@/lib/utils";
import { EnhancedAnalyticsDashboard } from "@/components/admin/EnhancedAnalyticsDashboard";

export default function AdminReports() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  const [userGrowth, setUserGrowth] = useState<any[]>([]);
  const [matchStats, setMatchStats] = useState<any[]>([]);
  const [activityStats, setActivityStats] = useState<any[]>([]);
  const [scheduledReports, setScheduledReports] = useState<any[]>([]);

  useEffect(() => {
    fetchReportData();
    fetchScheduledReports();
  }, [dateRange]);

  const fetchReportData = async () => {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());

      const { data: matches } = await supabase
        .from('matches')
        .select('matched_at')
        .gte('matched_at', dateRange.from.toISOString())
        .lte('matched_at', dateRange.to.toISOString());

      const { data: activities } = await supabase
        .from('activity_logs')
        .select('created_at, action_type')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());

      // Process user growth data
      const usersByDay = profiles?.reduce((acc: any, profile) => {
        const date = format(new Date(profile.created_at), 'MMM dd');
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      setUserGrowth(Object.entries(usersByDay || {}).map(([date, count]) => ({
        date,
        users: count,
      })));

      // Process match stats
      const matchesByDay = matches?.reduce((acc: any, match) => {
        const date = format(new Date(match.matched_at), 'MMM dd');
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      setMatchStats(Object.entries(matchesByDay || {}).map(([date, count]) => ({
        date,
        matches: count,
      })));

      // Process activity stats
      const activitiesByType = activities?.reduce((acc: any, activity) => {
        acc[activity.action_type] = (acc[activity.action_type] || 0) + 1;
        return acc;
      }, {});

      setActivityStats(Object.entries(activitiesByType || {}).map(([type, count]) => ({
        type,
        count,
      })));
    } catch (error) {
      console.error("Error fetching report data:", error);
      toast.error("Failed to fetch report data");
    }
  };

  const fetchScheduledReports = async () => {
    const { data } = await supabase
      .from('scheduled_reports')
      .select('*')
      .order('created_at', { ascending: false });
    
    setScheduledReports(data || []);
  };

  const sendWeeklyReport = async () => {
    try {
      const { error } = await supabase.functions.invoke('send-weekly-report');
      if (error) throw error;
      toast.success("Weekly report sent successfully");
    } catch (error) {
      console.error("Error sending report:", error);
      toast.error("Failed to send report");
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Reports</h1>
          <p className="text-muted-foreground">Comprehensive analytics and reporting</p>
        </div>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("justify-start text-left font-normal")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={{ from: dateRange?.from, to: dateRange?.to }}
                onSelect={(range: any) => range?.from && setDateRange({ from: range.from, to: range.to || range.from })}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          <Button onClick={sendWeeklyReport}>
            <Send className="w-4 h-4 mr-2" />
            Send Weekly Report
          </Button>
        </div>
      </div>

      <Tabs defaultValue="enhanced" className="space-y-4">
        <TabsList>
          <TabsTrigger value="enhanced">
            <BarChart3 className="w-4 h-4 mr-2" />
            Enhanced Analytics
          </TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">User Analytics</TabsTrigger>
          <TabsTrigger value="matches">Match Analytics</TabsTrigger>
          <TabsTrigger value="activity">Activity Reports</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="enhanced">
          <EnhancedAnalyticsDashboard />
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{userGrowth.reduce((sum, item) => sum + item.users, 0)}</div>
                <p className="text-xs text-muted-foreground">In selected period</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Total Matches</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{matchStats.reduce((sum, item) => sum + item.matches, 0)}</div>
                <p className="text-xs text-muted-foreground">In selected period</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Admin Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{activityStats.reduce((sum, item) => sum + item.count, 0)}</div>
                <p className="text-xs text-muted-foreground">In selected period</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>User Growth Trend</CardTitle>
              <ExportData dataType="users" />
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="users" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matches" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Match Statistics</CardTitle>
              <ExportData dataType="analytics" />
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={matchStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="matches" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Activity by Type</CardTitle>
              <ExportData dataType="activity_logs" />
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={activityStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="hsl(var(--accent))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {scheduledReports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-semibold">{report.report_type}</h4>
                      <p className="text-sm text-muted-foreground">Frequency: {report.frequency}</p>
                      <p className="text-sm text-muted-foreground">
                        Next scheduled: {report.next_scheduled ? format(new Date(report.next_scheduled), 'PPP') : 'N/A'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs ${report.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {report.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
