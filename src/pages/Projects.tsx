import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, FolderOpen, Users, Calendar, FolderKanban } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  BottomSheet,
  Chip,
  EmptyState,
  HScroll,
  Pressable,
  SectionHeader,
  SkeletonList,
  Surface,
} from "@/components/native-ui";
import { CollabTabs } from "@/components/collab/CollabTabs";
import { MyProjectInvites } from "@/components/projects/MyProjectInvites";

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  created_at: string | null;
  member_count: number;
}

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "on_hold", label: "On hold" },
  { key: "completed", label: "Completed" },
];

const Projects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
    project_category: "other",
    compensation_type: "open_collaboration",
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setCurrentUser(user.id);
      void loadProjects(user.id);
    });
  }, [navigate]);

  const loadProjects = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("created_by", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load projects");
      setProjects([]);
      setLoading(false);
      return;
    }

    const ids = (data ?? []).map((p) => p.id);
    let counts: Record<string, number> = {};
    if (ids.length) {
      const { data: members } = await supabase
        .from("project_members")
        .select("project_id")
        .in("project_id", ids);
      counts = (members ?? []).reduce<Record<string, number>>((acc, m) => {
        acc[m.project_id] = (acc[m.project_id] ?? 0) + 1;
        return acc;
      }, {});
    }

    setProjects(
      (data ?? []).map((p) => ({ ...p, member_count: counts[p.id] ?? 0 })) as Project[],
    );
    setLoading(false);
  };

  const filtered = useMemo(
    () => (status === "all" ? projects : projects.filter((p) => (p.status ?? "active") === status)),
    [projects, status],
  );

  const createProject = async () => {
    if (!newProject.title.trim()) {
      toast.error("Project title is required");
      return;
    }
    if (!currentUser) {
      toast.error("You must be signed in to create a project");
      return;
    }

    setCreating(true);
    const { data, error } = await supabase
      .from("projects")
      .insert({
        title: newProject.title,
        description: newProject.description || null,
        created_by: currentUser,
        project_category: newProject.project_category,
        compensation_type: newProject.compensation_type,
      } as never)
      .select()
      .single();
    setCreating(false);

    if (error || !data) {
      toast.error(error?.message ?? "Failed to create project");
      return;
    }

    toast.success("Project created");
    setNewProjectOpen(false);
    setNewProject({
      title: "",
      description: "",
      project_category: "other",
      compensation_type: "open_collaboration",
    });
    navigate(`/projects/${data.id}`);
  };

  return (
    <div className="space-y-4">
      <CollabTabs />

      {currentUser ? <MyProjectInvites userId={currentUser} /> : null}

      <SectionHeader
        title="My projects"
        subtitle={`${projects.length} collaboration${projects.length === 1 ? "" : "s"}`}
        action={
          <Pressable
            onClick={() => setNewProjectOpen(true)}
            aria-label="New project"
            className="flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-semibold text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </Pressable>
        }
      />

      <HScroll className="flex gap-2">
        {STATUS_FILTERS.map((f) => (
          <Chip key={f.key} active={status === f.key} onClick={() => setStatus(f.key)}>
            {f.label}
          </Chip>
        ))}
      </HScroll>

      {loading ? (
        <SkeletonList />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-6 w-6" />}
          title={projects.length ? "Nothing here yet" : "No projects yet"}
          description={
            projects.length
              ? "Try a different status filter to see your other collaborations."
              : "Spin up a room, invite your matches and keep briefs, files and chat in one place."
          }
          action={
            <Button onClick={() => setNewProjectOpen(true)} className="rounded-full">
              <Plus className="mr-1.5 h-4 w-4" />
              Create a project
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((project) => (
            <Pressable
              key={project.id}
              lift
              onClick={() => navigate(`/projects/${project.id}`)}
              aria-label={`Open ${project.title}`}
              className="text-left"
            >
              <Surface inset className="h-full space-y-3">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <FolderKanban className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{project.title}</p>
                    {project.description ? (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {project.description}
                      </p>
                    ) : null}
                  </div>
                  <Badge variant="secondary" className="shrink-0 capitalize">
                    {(project.status ?? "active").replace("_", " ")}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {project.member_count} member{project.member_count === 1 ? "" : "s"}
                  </span>
                  {project.created_at ? (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
                    </span>
                  ) : null}
                </div>
              </Surface>
            </Pressable>
          ))}
        </div>
      )}

      <BottomSheet
        open={newProjectOpen}
        onOpenChange={setNewProjectOpen}
        title="New project"
        description="Create a private room for your collaboration."
      >
        <div className="space-y-4 px-5 pb-2">
          <div className="space-y-2">
            <Label>Project title</Label>
            <Input
              value={newProject.title}
              onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
              placeholder="e.g. Midnight EP — visuals"
              className="rounded-2xl"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={newProject.description}
              onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
              placeholder="What are you making, and who do you need?"
              className="rounded-2xl"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={newProject.project_category}
                onValueChange={(v) => setNewProject({ ...newProject, project_category: v })}
              >
                <SelectTrigger className="rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="music">Music</SelectItem>
                  <SelectItem value="film">Film</SelectItem>
                  <SelectItem value="tech">Tech</SelectItem>
                  <SelectItem value="startup">Startup</SelectItem>
                  <SelectItem value="content_creation">Content creation</SelectItem>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Compensation</Label>
              <Select
                value={newProject.compensation_type}
                onValueChange={(v) => setNewProject({ ...newProject, compensation_type: v })}
              >
                <SelectTrigger className="rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="revenue_share">Revenue share</SelectItem>
                  <SelectItem value="equity">Equity</SelectItem>
                  <SelectItem value="open_collaboration">Open collaboration</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={createProject} disabled={creating} className="w-full rounded-full">
            {creating ? "Creating..." : "Create project"}
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
};

export default Projects;
