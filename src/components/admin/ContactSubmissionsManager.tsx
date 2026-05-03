import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { Mail, MessageSquare, Clock, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  creative_roles?: string[];
}

export const ContactSubmissionsManager = () => {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contact_submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch contact submissions");
      console.error(error);
      setLoading(false);
      return;
    }

    // Cross-reference submission emails with profile emails (admin-only via secure RPC).
    const submissionEmails = (data || []).map((s: any) => s.email).filter(Boolean);
    const profileIds = new Map<string, string>();
    if (submissionEmails.length > 0) {
      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("id");
      const allIds = (allProfiles || []).map((p: any) => p.id);
      const { data: emailRows } = await supabase.rpc("get_profile_emails", { _user_ids: allIds });
      (emailRows || []).forEach((p: any) => {
        if (p.email && submissionEmails.includes(p.email)) {
          profileIds.set(p.email, p.id);
        }
      });
    }

    // Fetch creative roles for matched profiles
    const matchedIds = Array.from(profileIds.values());
    let rolesMap = new Map<string, string[]>();
    if (matchedIds.length > 0) {
      const { data: rolesData } = await supabase
        .from("user_creative_roles")
        .select("user_id, role")
        .in("user_id", matchedIds);

      rolesData?.forEach((r: any) => {
        const existing = rolesMap.get(r.user_id) || [];
        existing.push(r.role);
        rolesMap.set(r.user_id, existing);
      });
    }

    const enriched = (data || []).map((s: any) => ({
      ...s,
      creative_roles: rolesMap.get(profileIds.get(s.email) || '') || []
    }));

    setSubmissions(enriched);
    setLoading(false);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from("contact_submissions")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success("Status updated");
      fetchSubmissions();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
      case "reviewed":
        return <Badge variant="secondary" className="gap-1"><CheckCircle className="w-3 h-3" />Reviewed</Badge>;
      case "resolved":
        return <Badge variant="default" className="gap-1"><CheckCircle className="w-3 h-3" />Resolved</Badge>;
      case "spam":
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Spam</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredSubmissions = submissions.filter(
    (s) => statusFilter === "all" || s.status === statusFilter
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Contact Form Submissions
            </CardTitle>
            <CardDescription>
              Manage and respond to contact form submissions
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="spam">Spam</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchSubmissions}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Loading submissions...</p>
        ) : filteredSubmissions.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No contact submissions found
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubmissions.map((submission) => (
                <TableRow key={submission.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(submission.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="font-medium">{submission.name}</TableCell>
                  <TableCell>
                    <a
                      href={`mailto:${submission.email}`}
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <Mail className="w-3 h-3" />
                      {submission.email}
                    </a>
                  </TableCell>
                  <TableCell className="text-sm">
                    {(submission as any).phone || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap max-w-[150px]">
                      {submission.creative_roles && submission.creative_roles.length > 0 ? (
                        submission.creative_roles.map((role, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {role}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {submission.subject}
                  </TableCell>
                  <TableCell>{getStatusBadge(submission.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>{submission.subject}</DialogTitle>
                            <DialogDescription>
                              From {submission.name} ({submission.email})
                            </DialogDescription>
                          </DialogHeader>
                          <div className="mt-4 space-y-4">
                            <div className="p-4 bg-muted rounded-lg">
                              <p className="whitespace-pre-wrap">{submission.message}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">
                                Update status:
                              </span>
                              <Select
                                value={submission.status}
                                onValueChange={(value) =>
                                  updateStatus(submission.id, value)
                                }
                              >
                                <SelectTrigger className="w-[150px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="reviewed">Reviewed</SelectItem>
                                  <SelectItem value="resolved">Resolved</SelectItem>
                                  <SelectItem value="spam">Spam</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Select
                        value={submission.status}
                        onValueChange={(value) => updateStatus(submission.id, value)}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="reviewed">Reviewed</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="spam">Spam</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
