import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JobPostingCard } from "@/components/jobs/JobPostingCard";
import { JobPostingForm } from "@/components/jobs/JobPostingForm";
import { JobApplicationDialog } from "@/components/jobs/JobApplicationDialog";
import { JobApplicationsList } from "@/components/jobs/JobApplicationsList";
import { UpgradePrompt } from "@/components/subscription/UpgradePrompt";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";
import { Briefcase, Plus, Search, Crown } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";

interface JobPosting {
  id: string;
  title: string;
  description: string;
  location: string | null;
  job_type: string;
  budget_range: string | null;
  required_roles: string[];
  required_skills: string[];
  created_at: string;
  user_id: string;
  profiles?: {
    full_name: string;
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
}

const Jobs = () => {
  const navigate = useNavigate();
  const { isPro, isStudio, loading: subLoading } = useSubscription();
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [myJobs, setMyJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [jobTypeFilter, setJobTypeFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editJob, setEditJob] = useState<JobPosting | null>(null);
  const [applyingJob, setApplyingJob] = useState<JobPosting | null>(null);
  const [selectedJobForApplications, setSelectedJobForApplications] = useState<string | null>(null);

  const canPostJobs = isPro || isStudio;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setCurrentUser(user.id);
        loadJobs();
        loadMyJobs(user.id);
      }
    });
  }, [navigate]);

  const loadJobs = async () => {
    setLoading(true);
    const { data: jobsData, error } = await supabase
      .from("job_postings")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load jobs");
      setLoading(false);
      return;
    }

    // Fetch profiles separately
    const userIds = [...new Set(jobsData?.map(j => j.user_id) || [])];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, is_verified")
      .in("id", userIds);

    const jobsWithProfiles = (jobsData || []).map(job => ({
      ...job,
      profiles: profilesData?.find(p => p.id === job.user_id) || undefined,
    }));

    setJobs(jobsWithProfiles as JobPosting[]);
    setLoading(false);
  };

  const loadMyJobs = async (userId: string) => {
    const { data, error } = await supabase
      .from("job_postings")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error) {
      setMyJobs(data || []);
    }
  };

  const handleApply = (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (job) {
      setApplyingJob(job);
    }
  };

  const handleViewApplications = (jobId: string) => {
    setSelectedJobForApplications(selectedJobForApplications === jobId ? null : jobId);
  };

  const handleEdit = (jobId: string) => {
    const job = myJobs.find(j => j.id === jobId);
    if (job) {
      setEditJob(job);
      setFormOpen(true);
    }
  };

  const handleDelete = async (jobId: string) => {
    const { error } = await supabase
      .from("job_postings")
      .delete()
      .eq("id", jobId);

    if (error) {
      toast.error("Failed to delete job");
    } else {
      toast.success("Job deleted");
      if (currentUser) loadMyJobs(currentUser);
      loadJobs();
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = !searchQuery || 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === "all" || !roleFilter || job.required_roles.includes(roleFilter);
    const matchesType = jobTypeFilter === "all" || !jobTypeFilter || job.job_type === jobTypeFilter;

    return matchesSearch && matchesRole && matchesType;
  });

  if (subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-4">
      <div className="max-w-6xl mx-auto py-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Briefcase className="w-8 h-8 text-primary" />
              Job Board
            </h1>
            <p className="text-muted-foreground">Find creative opportunities or post your own</p>
          </div>

          {canPostJobs ? (
            <Button onClick={() => { setEditJob(null); setFormOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Post a Job
            </Button>
          ) : (
            <Button variant="outline" onClick={() => navigate("/pricing")}>
              <Crown className="w-4 h-4 mr-2 text-yellow-500" />
              Upgrade to Post Jobs
            </Button>
          )}
        </div>

        <Tabs defaultValue="browse" className="space-y-6">
          <TabsList>
            <TabsTrigger value="browse">Browse Jobs</TabsTrigger>
            <TabsTrigger value="my-jobs">My Jobs ({myJobs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search jobs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={roleFilter || "all"} onValueChange={(val) => setRoleFilter(val === "all" ? "" : val)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All roles</SelectItem>
                      {Constants.public.Enums.creative_role.map((role) => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={jobTypeFilter || "all"} onValueChange={(val) => setJobTypeFilter(val === "all" ? "" : val)}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Job type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                      <SelectItem value="gig">Gig</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Job Listings */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="h-48 animate-pulse bg-muted" />
                ))}
              </div>
            ) : filteredJobs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">No jobs found</h3>
                  <p className="text-muted-foreground">
                    {searchQuery || roleFilter || jobTypeFilter
                      ? "Try adjusting your filters"
                      : "Be the first to post a job opportunity"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredJobs.map((job) => (
                  <JobPostingCard
                    key={job.id}
                    job={job}
                    onApply={handleApply}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my-jobs" className="space-y-4">
            {!canPostJobs ? (
              <UpgradePrompt
                feature="job posting"
                description="Post jobs and find talented creatives for your projects"
                requiredTier="pro"
              />
            ) : myJobs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">No jobs posted yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Share your first creative opportunity
                  </p>
                  <Button onClick={() => { setEditJob(null); setFormOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Post Your First Job
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {myJobs.map((job) => (
                  <div key={job.id} className="space-y-4">
                    <JobPostingCard
                      job={job}
                      isOwner
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onViewApplications={handleViewApplications}
                    />
                    {selectedJobForApplications === job.id && (
                      <div className="ml-4 border-l-2 border-primary/20 pl-4">
                        <JobApplicationsList jobId={job.id} isOwner={true} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {currentUser && (
          <JobPostingForm
            open={formOpen}
            onOpenChange={setFormOpen}
            userId={currentUser}
            onSuccess={() => {
              loadJobs();
              if (currentUser) loadMyJobs(currentUser);
            }}
            editJob={editJob}
          />
        )}

        <JobApplicationDialog
          job={applyingJob}
          open={!!applyingJob}
          onOpenChange={(open) => !open && setApplyingJob(null)}
          currentUserId={currentUser || ""}
        />
      </div>
    </div>
  );
};

export default Jobs;
