import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { Activity, CheckCircle2, Circle, Upload, UserPlus, Flag, UserCog } from "lucide-react";

interface ActivityLog {
  id: string;
  user_id: string;
  action_type: string;
  description: string;
  metadata: unknown;
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface ActivityFeedProps {
  projectId: string;
}

export const ActivityFeed = ({ projectId }: ActivityFeedProps) => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`project-activity-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_activity_logs",
          filter: `project_id=eq.${projectId}`,
        },
        () => loadActivities()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const loadActivities = async () => {
    const { data, error } = await supabase
      .from("project_activity_logs")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Failed to load activities:", error);
      setLoading(false);
      return;
    }

    // Fetch user profiles
    const userIds = [...new Set(data?.map(a => a.user_id) || [])];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", userIds);

    const activitiesWithProfiles = (data || []).map(activity => ({
      ...activity,
      profiles: profiles?.find(p => p.id === activity.user_id),
    }));

    setActivities(activitiesWithProfiles);
    setLoading(false);
  };

  const getActivityIcon = (actionType: string) => {
    switch (actionType) {
      case "task_created":
        return <Circle className="w-4 h-4 text-blue-500" />;
      case "task_status_changed":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "file_uploaded":
        return <Upload className="w-4 h-4 text-purple-500" />;
      case "member_joined":
        return <UserPlus className="w-4 h-4 text-orange-500" />;
      case "role_changed":
        return <UserCog className="w-4 h-4 text-sky-500" />;
      case "milestone":
        return <Flag className="w-4 h-4 text-pink-500" />;
      default:
        return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getActivityBadge = (actionType: string) => {
    switch (actionType) {
      case "task_created":
        return <Badge variant="outline" className="text-xs">Task</Badge>;
      case "task_status_changed":
        return <Badge variant="secondary" className="text-xs">Status</Badge>;
      case "file_uploaded":
        return <Badge className="bg-purple-500/20 text-purple-600 text-xs">File</Badge>;
      case "member_joined":
        return <Badge className="bg-orange-500/20 text-orange-600 text-xs">Joined</Badge>;
      case "role_changed":
        return <Badge className="bg-sky-500/20 text-sky-600 text-xs">Role</Badge>;
      case "milestone":
        return <Badge className="bg-pink-500/20 text-pink-600 text-xs">Milestone</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Activity log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Activity log
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No activity yet. Milestones, uploads, joins and role changes will show up here.
          </p>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
            {activities.map((activity) => (
              <div key={activity.id} className="flex gap-3">
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(activity.action_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={activity.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {activity.profiles?.full_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {activity.profiles?.full_name || "Unknown"}
                    </span>
                    {getActivityBadge(activity.action_type)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {activity.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
