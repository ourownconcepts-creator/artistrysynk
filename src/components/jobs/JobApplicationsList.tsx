import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Check, X, Clock, Mail, User } from "lucide-react";

interface Application {
  id: string;
  job_id: string;
  applicant_id: string;
  cover_letter: string | null;
  status: string;
  created_at: string;
  job_title?: string;
  profiles?: {
    full_name: string;
    username: string;
    avatar_url: string | null;
  };
}

interface JobApplicationsListProps {
  jobId: string;
  isOwner: boolean;
}

export const JobApplicationsList = ({ jobId, isOwner }: JobApplicationsListProps) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApplications();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`job-applications-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "job_applications",
          filter: `job_id=eq.${jobId}`,
        },
        () => loadApplications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  const loadApplications = async () => {
    const { data, error } = await supabase
      .from("job_applications")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load applications:", error);
      setLoading(false);
      return;
    }

    // Fetch applicant profiles
    const applicantIds = data?.map(a => a.applicant_id) || [];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .in("id", applicantIds);

    const applicationsWithProfiles = (data || []).map(app => ({
      ...app,
      profiles: profiles?.find(p => p.id === app.applicant_id),
    }));

    setApplications(applicationsWithProfiles);
    setLoading(false);
  };

  const updateStatus = async (applicationId: string, status: string) => {
    const { error } = await supabase
      .from("job_applications")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", applicationId);

    if (error) {
      toast.error("Failed to update application status");
    } else {
      toast.success(`Application ${status}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return <Badge className="bg-green-500/20 text-green-600">Accepted</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "pending":
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold mb-1">No applications yet</h3>
          <p className="text-sm text-muted-foreground">
            Applications will appear here when creatives apply
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">
        Applications ({applications.length})
      </h3>

      {applications.map((application) => (
        <Card key={application.id}>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <Avatar>
                <AvatarImage src={application.profiles?.avatar_url || undefined} />
                <AvatarFallback>
                  {application.profiles?.full_name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div>
                    <span className="font-medium">
                      {application.profiles?.full_name || "Unknown"}
                    </span>
                    <span className="text-sm text-muted-foreground ml-2">
                      @{application.profiles?.username}
                    </span>
                  </div>
                  {getStatusBadge(application.status)}
                </div>

                <p className="text-xs text-muted-foreground mb-2">
                  Applied {formatDistanceToNow(new Date(application.created_at), { addSuffix: true })}
                </p>

                {application.cover_letter && (
                  <div className="p-3 bg-muted/50 rounded-lg mt-2">
                    <p className="text-sm whitespace-pre-wrap">{application.cover_letter}</p>
                  </div>
                )}

                {isOwner && application.status === "pending" && (
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 hover:bg-green-50"
                      onClick={() => updateStatus(application.id, "accepted")}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => updateStatus(application.id, "rejected")}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
