import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Search, Users, Calendar, Send, Briefcase, CheckCircle, Plus, Crown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useSubscription } from "@/hooks/useSubscription";
import { Constants } from "@/integrations/supabase/types";
import { getRoleLabel } from "@/lib/creativeRoles";

interface OpenProject {
  id: string;
  title: string;
  description: string;
  looking_for: string[];
  budget: string;
  created_at: string;
  created_by: string;
  profiles: {
    full_name: string;
    username: string;
    avatar_url: string;
  };
  project_members: { count: number }[];
  hasApplied?: boolean;
}

const OpenProjects = () => {
  const navigate = useNavigate();
  const { canPostPublicProjects, isStudio } = useSubscription();
  const [projects, setProjects] = useState<OpenProject[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [applyingTo, setApplyingTo] = useState<string | null>(null);
  const [applicationMessage, setApplicationMessage] = useState("");
  
  // New project creation state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
    budget: "",
    looking_for: [] as string[],
    project_category: "other",
    compensation_type: "open_collaboration",
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setCurrentUser(user.id);
        loadProjects(user.id);
      }
    });
  }, [navigate]);

  const loadProjects = async (userId: string) => {
    // Load public projects
    const { data: projectsData, error } = await supabase
      .from("projects")
      .select(`
        *,
        profiles:created_by(full_name, username, avatar_url),
        project_members(count)
      `)
      .eq("is_public", true)
      .neq("created_by", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load projects");
      setLoading(false);
      return;
    }

    // Check which projects user has already applied to
    const { data: applications } = await supabase
      .from("project_applications")
      .select("project_id")
      .eq("applicant_id", userId);

    const appliedProjectIds = new Set(applications?.map(a => a.project_id) || []);

    const projectsWithStatus = (projectsData || []).map(p => ({
      ...p,
      hasApplied: appliedProjectIds.has(p.id)
    }));

    setProjects(projectsWithStatus);
    setLoading(false);
  };

  const applyToProject = async (projectId: string) => {
    if (!currentUser) return;

    const { error } = await supabase.from("project_applications").insert({
      project_id: projectId,
      applicant_id: currentUser,
      message: applicationMessage,
    });

    if (error) {
      if (error.code === "23505") {
        toast.error("You've already applied to this project");
      } else {
        toast.error("Failed to submit application");
      }
      return;
    }

    toast.success("Application submitted!");
    setApplyingTo(null);
    setApplicationMessage("");
    loadProjects(currentUser);
  };

  const createPublicProject = async () => {
    if (!currentUser || !newProject.title.trim()) {
      toast.error("Project title is required");
      return;
    }

    const { data, error } = await supabase.from("projects").insert({
      title: newProject.title,
      description: newProject.description,
      budget: newProject.budget,
      looking_for: newProject.looking_for,
      created_by: currentUser,
      is_public: true,
      status: "active",
      project_category: newProject.project_category,
      compensation_type: newProject.compensation_type,
    } as any).select().single();

    if (error) {
      toast.error("Failed to create project");
      return;
    }

    toast.success("Project posted successfully!");
    setShowCreateDialog(false);
    setNewProject({ title: "", description: "", budget: "", looking_for: [], project_category: "other", compensation_type: "open_collaboration" });
    navigate(`/projects/${data.id}`);
  };

  const toggleRole = (role: string) => {
    setNewProject(prev => ({
      ...prev,
      looking_for: prev.looking_for.includes(role)
        ? prev.looking_for.filter(r => r !== role)
        : [...prev.looking_for, role]
    }));
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.looking_for?.some(role => role.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-4">
      <div className="max-w-6xl mx-auto py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Open Projects
            </h1>
            <p className="text-muted-foreground">Discover collaboration opportunities and apply to join</p>
          </div>
          
          {/* Direct Project Posting for Studio users */}
          {canPostPublicProjects ? (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button variant="hero">
                  <Plus className="w-4 h-4 mr-2" />
                  Post a Project
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Post a Public Project</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Project Title</Label>
                    <Input
                      value={newProject.title}
                      onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                      placeholder="Enter project title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={newProject.description}
                      onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                      placeholder="Describe your project and what you're looking for..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Budget (optional)</Label>
                    <Input
                      value={newProject.budget}
                      onChange={(e) => setNewProject({ ...newProject, budget: e.target.value })}
                      placeholder="e.g., ₦50,000 - ₦100,000"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={newProject.project_category} onValueChange={(v) => setNewProject({ ...newProject, project_category: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="music">Music</SelectItem>
                          <SelectItem value="film">Film</SelectItem>
                          <SelectItem value="tech">Tech</SelectItem>
                          <SelectItem value="startup">Startup</SelectItem>
                          <SelectItem value="content_creation">Content Creation</SelectItem>
                          <SelectItem value="design">Design</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Compensation</Label>
                      <Select value={newProject.compensation_type} onValueChange={(v) => setNewProject({ ...newProject, compensation_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="revenue_share">Revenue Share</SelectItem>
                          <SelectItem value="equity">Equity</SelectItem>
                          <SelectItem value="open_collaboration">Open Collaboration</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Looking for (select roles)</Label>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                      {Constants.public.Enums.creative_role.map((role) => (
                        <Badge
                          key={role}
                          variant={newProject.looking_for.includes(role) ? "default" : "outline"}
                          className="cursor-pointer text-xs"
                          onClick={() => toggleRole(role)}
                        >
                          {getRoleLabel(role)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button onClick={createPublicProject} className="w-full">
                    <Send className="w-4 h-4 mr-2" />
                    Post Project
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <Button variant="outline" onClick={() => navigate("/pricing")}>
              <Crown className="w-4 h-4 mr-2 text-yellow-500" />
              Upgrade to Post
            </Button>
          )}
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by project name, description, or roles needed..."
            className="pl-10"
          />
        </div>

        {filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">No open projects found</h2>
              <p className="text-muted-foreground">
                Check back later for new collaboration opportunities
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project) => (
              <Card key={project.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{project.title}</CardTitle>
                    {project.hasApplied && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Applied
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    by {project.profiles?.full_name || "Unknown"}{' '}
                    {project.profiles?.username && <span className="text-xs">@{project.profiles.username}</span>}
                  </p>
                </CardHeader>
                <CardContent className="flex-1">
                  {project.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {project.description}
                    </p>
                  )}
                  
                  {project.looking_for && project.looking_for.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium mb-2">Looking for:</p>
                      <div className="flex flex-wrap gap-1">
                        {project.looking_for.map((role, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {project.budget && (
                    <p className="text-sm font-medium text-primary">
                      Budget: {project.budget}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-sm text-muted-foreground mt-4">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{project.project_members?.[0]?.count || 1}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Dialog open={applyingTo === project.id} onOpenChange={(open) => setApplyingTo(open ? project.id : null)}>
                    <DialogTrigger asChild>
                      <Button 
                        className="w-full" 
                        disabled={project.hasApplied}
                        variant={project.hasApplied ? "secondary" : "default"}
                      >
                        {project.hasApplied ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Applied
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Apply to Join
                          </>
                        )}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Apply to {project.title}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Why do you want to join this project?</Label>
                          <Textarea
                            value={applicationMessage}
                            onChange={(e) => setApplicationMessage(e.target.value)}
                            placeholder="Introduce yourself and explain what you can contribute..."
                            rows={4}
                          />
                        </div>
                        <Button onClick={() => applyToProject(project.id)} className="w-full">
                          <Send className="w-4 h-4 mr-2" />
                          Submit Application
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OpenProjects;