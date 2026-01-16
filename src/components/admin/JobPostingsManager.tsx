import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Briefcase, Eye, Trash2, ToggleLeft, ToggleRight, Users } from "lucide-react";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface JobPosting {
  id: string;
  title: string;
  description: string;
  job_type: string;
  location: string | null;
  budget_range: string | null;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
  user_id: string;
  poster_name?: string;
  application_count?: number;
}

export const JobPostingsManager = () => {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    
    const { data: jobsData, error: jobsError } = await supabase
      .from("job_postings")
      .select("*")
      .order("created_at", { ascending: false });

    if (jobsError) {
      toast.error("Failed to fetch job postings");
      setLoading(false);
      return;
    }

    // Get poster profiles
    const userIds = [...new Set(jobsData?.map(j => j.user_id) || [])];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    // Get application counts
    const { data: applications } = await supabase
      .from("job_applications")
      .select("job_id");

    const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
    const appCounts = applications?.reduce((acc: Record<string, number>, app) => {
      acc[app.job_id] = (acc[app.job_id] || 0) + 1;
      return acc;
    }, {}) || {};

    const enrichedJobs = jobsData?.map(job => ({
      ...job,
      poster_name: profileMap.get(job.user_id) || "Unknown",
      application_count: appCounts[job.id] || 0,
    })) || [];

    setJobs(enrichedJobs);
    setLoading(false);
  };

  const toggleJobStatus = async (jobId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("job_postings")
      .update({ is_active: !currentStatus })
      .eq("id", jobId);

    if (error) {
      toast.error("Failed to update job status");
      return;
    }

    toast.success(`Job ${!currentStatus ? "activated" : "deactivated"}`);
    fetchJobs();
  };

  const deleteJob = async (jobId: string) => {
    const { error } = await supabase
      .from("job_postings")
      .delete()
      .eq("id", jobId);

    if (error) {
      toast.error("Failed to delete job posting");
      return;
    }

    toast.success("Job posting deleted");
    fetchJobs();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="w-5 h-5" />
          Job Postings Management
        </CardTitle>
        <CardDescription>Manage and moderate job postings</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Loading job postings...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Posted By</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Applications</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {job.title}
                  </TableCell>
                  <TableCell>{job.poster_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{job.job_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {job.application_count}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={job.is_active ? "default" : "secondary"}>
                      {job.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(job.created_at), "MMM dd, yyyy")}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" onClick={() => setSelectedJob(job)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>{job.title}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <strong>Description:</strong>
                              <p className="mt-1 text-muted-foreground whitespace-pre-wrap">{job.description}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <strong>Type:</strong> {job.job_type}
                              </div>
                              <div>
                                <strong>Location:</strong> {job.location || "Remote"}
                              </div>
                              <div>
                                <strong>Budget:</strong> {job.budget_range || "Not specified"}
                              </div>
                              <div>
                                <strong>Expires:</strong> {job.expires_at ? format(new Date(job.expires_at), "MMM dd, yyyy") : "No expiry"}
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleJobStatus(job.id, job.is_active)}
                      >
                        {job.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Job Posting</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{job.title}"? This will also remove all applications.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteJob(job.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {jobs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No job postings found
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
