import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FolderKanban, Eye, Trash2, Users, FileText, Globe, Lock } from "lucide-react";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: "pending" | "active" | "completed" | "cancelled" | null;
  is_public: boolean | null;
  budget: string | null;
  created_by: string;
  created_at: string | null;
  creator_name?: string;
  member_count?: number;
  task_count?: number;
  file_count?: number;
}

export const ProjectsManager = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    
    const { data: projectsData, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch projects");
      setLoading(false);
      return;
    }

    // Get creator profiles
    const creatorIds = [...new Set(projectsData?.map(p => p.created_by) || [])];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", creatorIds);

    // Get member counts
    const { data: members } = await supabase
      .from("project_members")
      .select("project_id");

    // Get task counts
    const { data: tasks } = await supabase
      .from("project_tasks")
      .select("project_id");

    // Get file counts
    const { data: files } = await supabase
      .from("project_files")
      .select("project_id");

    const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
    
    const memberCounts = members?.reduce((acc: Record<string, number>, m) => {
      acc[m.project_id] = (acc[m.project_id] || 0) + 1;
      return acc;
    }, {}) || {};

    const taskCounts = tasks?.reduce((acc: Record<string, number>, t) => {
      acc[t.project_id] = (acc[t.project_id] || 0) + 1;
      return acc;
    }, {}) || {};

    const fileCounts = files?.reduce((acc: Record<string, number>, f) => {
      acc[f.project_id] = (acc[f.project_id] || 0) + 1;
      return acc;
    }, {}) || {};

    const enrichedProjects = projectsData?.map(project => ({
      ...project,
      creator_name: profileMap.get(project.created_by) || "Unknown",
      member_count: memberCounts[project.id] || 0,
      task_count: taskCounts[project.id] || 0,
      file_count: fileCounts[project.id] || 0,
    })) || [];

    setProjects(enrichedProjects);
    setLoading(false);
  };

  const updateProjectStatus = async (projectId: string, newStatus: "pending" | "active" | "completed" | "cancelled") => {
    const { error } = await supabase
      .from("projects")
      .update({ status: newStatus })
      .eq("id", projectId);

    if (error) {
      toast.error("Failed to update project status");
      return;
    }

    toast.success("Project status updated");
    fetchProjects();
  };

  const toggleProjectVisibility = async (projectId: string, currentVisibility: boolean | null) => {
    const { error } = await supabase
      .from("projects")
      .update({ is_public: !currentVisibility })
      .eq("id", projectId);

    if (error) {
      toast.error("Failed to update project visibility");
      return;
    }

    toast.success(`Project is now ${!currentVisibility ? "public" : "private"}`);
    fetchProjects();
  };

  const deleteProject = async (projectId: string) => {
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (error) {
      toast.error("Failed to delete project");
      return;
    }

    toast.success("Project deleted");
    fetchProjects();
  };

  const getStatusBadgeVariant = (status: string | null) => {
    switch (status) {
      case "active": return "default";
      case "completed": return "secondary";
      case "pending": return "outline";
      case "cancelled": return "destructive";
      default: return "outline";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderKanban className="w-5 h-5" />
          Projects Management
        </CardTitle>
        <CardDescription>Oversee and moderate collaboration projects</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Loading projects...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Creator</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Tasks</TableHead>
                <TableHead>Files</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium max-w-[150px] truncate">
                    {project.title}
                  </TableCell>
                  <TableCell>{project.creator_name}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(project.status)}>
                      {project.status || "pending"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleProjectVisibility(project.id, project.is_public)}
                    >
                      {project.is_public ? (
                        <Globe className="w-4 h-4 text-green-500" />
                      ) : (
                        <Lock className="w-4 h-4 text-orange-500" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {project.member_count}
                    </span>
                  </TableCell>
                  <TableCell>{project.task_count}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {project.file_count}
                    </span>
                  </TableCell>
                  <TableCell>
                    {project.created_at ? format(new Date(project.created_at), "MMM dd, yyyy") : "N/A"}
                  </TableCell>
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
                            <DialogTitle>{project.title}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <p className="text-muted-foreground">{project.description || "No description"}</p>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div><strong>Budget:</strong> {project.budget || "Not specified"}</div>
                              <div><strong>Status:</strong> {project.status}</div>
                              <div><strong>Members:</strong> {project.member_count}</div>
                              <div><strong>Tasks:</strong> {project.task_count}</div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Select
                        value={project.status || "pending"}
                        onValueChange={(value) => updateProjectStatus(project.id, value as any)}
                      >
                        <SelectTrigger className="w-[110px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Project</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{project.title}"? This will remove all tasks, files, and members.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteProject(project.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {projects.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    No projects found
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
