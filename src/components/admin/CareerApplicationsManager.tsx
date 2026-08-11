import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UGC_LINK_REL, sanitizeExternalUrl } from "@/lib/safeLinks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserPlus, Eye, Mail, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CareerApplication {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  job_title: string;
  department: string;
  cover_letter: string;
  portfolio_url: string | null;
  status: string | null;
  created_at: string;
}

export const CareerApplicationsManager = () => {
  const [applications, setApplications] = useState<CareerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from("career_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch applications");
      setLoading(false);
      return;
    }

    setApplications(data || []);
    setLoading(false);
  };

  const updateApplicationStatus = async (applicationId: string, newStatus: string) => {
    const { error } = await supabase
      .from("career_applications")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", applicationId);

    if (error) {
      toast.error("Failed to update application status");
      return;
    }

    toast.success("Application status updated");
    fetchApplications();
  };

  const getStatusBadgeVariant = (status: string | null) => {
    switch (status) {
      case "approved": return "default";
      case "interview": return "secondary";
      case "pending": return "outline";
      case "rejected": return "destructive";
      default: return "outline";
    }
  };

  const filteredApplications = filterStatus === "all" 
    ? applications 
    : applications.filter(a => a.status === filterStatus);

  const statusCounts = {
    all: applications.length,
    pending: applications.filter(a => a.status === "pending" || !a.status).length,
    interview: applications.filter(a => a.status === "interview").length,
    approved: applications.filter(a => a.status === "approved").length,
    rejected: applications.filter(a => a.status === "rejected").length,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Career Applications
        </CardTitle>
        <CardDescription>Review applications for platform positions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Filter */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(statusCounts).map(([status, count]) => (
            <Button
              key={status}
              variant={filterStatus === status ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)} ({count})
            </Button>
          ))}
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading applications...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Applicant</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApplications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{app.full_name}</p>
                      <p className="text-sm text-muted-foreground">{app.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{app.job_title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{app.department}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(app.status)}>
                      {app.status || "pending"}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(app.created_at), "MMM dd, yyyy")}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Application Details</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <strong>Name:</strong>
                                <p>{app.full_name}</p>
                              </div>
                              <div>
                                <strong>Email:</strong>
                                <p>{app.email}</p>
                              </div>
                              <div>
                                <strong>Phone:</strong>
                                <p>{app.phone || "Not provided"}</p>
                              </div>
                              <div>
                                <strong>Position:</strong>
                                <p>{app.job_title}</p>
                              </div>
                              <div>
                                <strong>Department:</strong>
                                <p>{app.department}</p>
                              </div>
                              <div>
                                <strong>Portfolio:</strong>
                                {sanitizeExternalUrl(app.portfolio_url) ? (
                                  <a 
                                    href={sanitizeExternalUrl(app.portfolio_url)!} 
                                    target="_blank" 
                                    rel={UGC_LINK_REL}
                                    className="text-primary hover:underline flex items-center gap-1"
                                  >
                                    View <ExternalLink className="w-3 h-3" />
                                  </a>
                                ) : (
                                  <p>Not provided</p>
                                )}
                              </div>
                            </div>
                            <div>
                              <strong>Cover Letter:</strong>
                              <p className="mt-2 p-4 bg-muted rounded-lg whitespace-pre-wrap">
                                {app.cover_letter}
                              </p>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.location.href = `mailto:${app.email}`}
                      >
                        <Mail className="w-4 h-4" />
                      </Button>
                      <Select
                        value={app.status || "pending"}
                        onValueChange={(value) => updateApplicationStatus(app.id, value)}
                      >
                        <SelectTrigger className="w-[110px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="interview">Interview</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredApplications.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No applications found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
