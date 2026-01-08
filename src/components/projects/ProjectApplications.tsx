import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { UserPlus, Check, X, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Application {
  id: string;
  applicant_id: string;
  message: string;
  status: string;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string;
    username: string;
  };
}

interface ProjectApplicationsProps {
  projectId: string;
  isOwner: boolean;
}

export const ProjectApplications = ({ projectId, isOwner }: ProjectApplicationsProps) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApplications();
  }, [projectId]);

  const loadApplications = async () => {
    const { data, error } = await supabase
      .from("project_applications")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading applications:", error);
    } else {
      setApplications((data || []) as any);
    }
    setLoading(false);
  };

  const updateApplication = async (applicationId: string, status: string, applicantId: string) => {
    const { error } = await supabase
      .from("project_applications")
      .update({ status })
      .eq("id", applicationId);

    if (error) {
      toast.error("Failed to update application");
      return;
    }

    // If approved, add as project member
    if (status === "approved") {
      const { error: memberError } = await supabase.from("project_members").insert({
        project_id: projectId,
        user_id: applicantId,
        role: "member",
      });

      if (memberError && memberError.code !== "23505") {
        toast.error("Failed to add member");
        return;
      }
    }

    toast.success(status === "approved" ? "Application approved! Member added." : "Application rejected.");
    loadApplications();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="default" className="bg-green-500"><Check className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive"><X className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (!isOwner && applications.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Applications ({applications.filter(a => a.status === "pending").length} pending)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {applications.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No applications yet
          </p>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div
                key={app.id}
                className="flex items-start gap-4 p-4 bg-muted rounded-lg"
              >
                <Avatar className="w-10 h-10">
                  <AvatarImage src={app.profiles?.avatar_url} />
                  <AvatarFallback>{app.profiles?.full_name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{app.profiles?.full_name}</p>
                    <span className="text-sm text-muted-foreground">@{app.profiles?.username}</span>
                    {getStatusBadge(app.status)}
                  </div>
                  {app.message && (
                    <p className="text-sm text-muted-foreground mb-2">{app.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Applied {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                  </p>
                </div>
                {isOwner && app.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => updateApplication(app.id, "approved", app.applicant_id)}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateApplication(app.id, "rejected", app.applicant_id)}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};