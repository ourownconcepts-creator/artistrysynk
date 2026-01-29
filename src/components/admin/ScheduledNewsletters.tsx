import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Calendar, Clock, Trash2, Send, Users, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface ScheduledNewsletter {
  id: string;
  subject: string;
  content: string;
  preview_text: string | null;
  audience: string;
  template_id: string;
  scheduled_at: string;
  status: string;
  sent_at: string | null;
  error_message: string | null;
  recipients_count: number | null;
  created_at: string;
}

export const ScheduledNewsletters = () => {
  const queryClient = useQueryClient();

  const { data: newsletters, isLoading } = useQuery({
    queryKey: ["scheduled-newsletters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scheduled_newsletters")
        .select("*")
        .order("scheduled_at", { ascending: true });

      if (error) throw error;
      return data as ScheduledNewsletter[];
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("scheduled_newsletters")
        .update({ status: "cancelled" })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Newsletter cancelled");
      queryClient.invalidateQueries({ queryKey: ["scheduled-newsletters"] });
    },
    onError: () => {
      toast.error("Failed to cancel newsletter");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("scheduled_newsletters")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Newsletter deleted");
      queryClient.invalidateQueries({ queryKey: ["scheduled-newsletters"] });
    },
    onError: () => {
      toast.error("Failed to delete newsletter");
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" /> Scheduled</Badge>;
      case "sent":
        return <Badge variant="default" className="gap-1"><CheckCircle2 className="w-3 h-3" /> Sent</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="gap-1">Cancelled</Badge>;
      case "failed":
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" /> Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getAudienceLabel = (audience: string) => {
    switch (audience) {
      case "subscribers":
        return "Subscribers";
      case "users":
        return "App Users";
      case "both":
        return "All";
      default:
        return audience;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const pendingNewsletters = newsletters?.filter(n => n.status === "pending") || [];
  const pastNewsletters = newsletters?.filter(n => n.status !== "pending") || [];

  return (
    <div className="space-y-6">
      {/* Pending/Scheduled */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Scheduled Newsletters
          </CardTitle>
          <CardDescription>
            Newsletters waiting to be sent
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingNewsletters.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No scheduled newsletters</p>
          ) : (
            <div className="space-y-4">
              {pendingNewsletters.map((newsletter) => (
                <div
                  key={newsletter.id}
                  className="flex items-start justify-between p-4 border rounded-lg bg-muted/30"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{newsletter.subject}</h4>
                      {getStatusBadge(newsletter.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {format(new Date(newsletter.scheduled_at), "PPP 'at' p")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {getAudienceLabel(newsletter.audience)}
                      </span>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        Cancel
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Scheduled Newsletter?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will prevent the newsletter from being sent. You can delete it afterwards if needed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep Scheduled</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => cancelMutation.mutate(newsletter.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Cancel Newsletter
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>Newsletter History</CardTitle>
          <CardDescription>
            Past sent, cancelled, or failed newsletters
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pastNewsletters.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No newsletter history</p>
          ) : (
            <div className="space-y-3">
              {pastNewsletters.map((newsletter) => (
                <div
                  key={newsletter.id}
                  className="flex items-start justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{newsletter.subject}</h4>
                      {getStatusBadge(newsletter.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {newsletter.sent_at && (
                        <span>Sent: {format(new Date(newsletter.sent_at), "PPP 'at' p")}</span>
                      )}
                      {newsletter.recipients_count !== null && (
                        <span className="flex items-center gap-1">
                          <Send className="w-3.5 h-3.5" />
                          {newsletter.recipients_count} recipients
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {getAudienceLabel(newsletter.audience)}
                      </span>
                    </div>
                    {newsletter.error_message && (
                      <p className="text-sm text-destructive">{newsletter.error_message}</p>
                    )}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Newsletter?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this newsletter record from history.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(newsletter.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
