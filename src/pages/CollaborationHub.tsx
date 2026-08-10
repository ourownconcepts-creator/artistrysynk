import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeChannel } from "@/hooks/useRealtimeChannel";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  CalendarClock,
  CheckCircle2,
  Circle,
  Clock,
  FolderOpen,
  LayoutDashboard,
  ListChecks,
  NotebookPen,
  Package,
  Plus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AppShell } from "@/components/app-shell/AppShell";
import {
  Chip,
  EmptyState,
  HScroll,
  ListRow,
  SectionHeader,
  SkeletonList,
  StatBlock,
  Surface,
} from "@/components/native-ui";
import { ActivityFeed } from "@/components/projects/ActivityFeed";
import { ProjectFiles } from "@/components/projects/ProjectFiles";
import { ExternalFileLinks } from "@/components/projects/ExternalFileLinks";
import { ProjectInvites } from "@/components/projects/ProjectInvites";
import { RoleApprovals } from "@/components/projects/RoleApprovals";
import { MeetingsPanel } from "@/components/hub/MeetingsPanel";
import { NotesPanel } from "@/components/hub/NotesPanel";
import { DeliverablesPanel, type HubMember } from "@/components/hub/DeliverablesPanel";

type Project = {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  created_by: string;
  created_at: string | null;
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  assigned_to: string | null;
};

const TABS = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "members", label: "Members", icon: Users },
  { key: "timeline", label: "Timeline", icon: Activity },
  { key: "tasks", label: "Tasks", icon: ListChecks },
  { key: "files", label: "Files", icon: FolderOpen },
  { key: "meetings", label: "Meetings", icon: CalendarClock },
  { key: "notes", label: "Notes", icon: NotebookPen },
  { key: "deliverables", label: "Deliverables", icon: Package },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function CollaborationHub() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<HubMember[]>([]);
  const [deliverableCount, setDeliverableCount] = useState(0);
  const [meetingCount, setMeetingCount] = useState(0);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "medium", assigned_to: "unassigned" });

  const loadTasks = async () => {
    if (!projectId) return;
    const { data } = await supabase
      .from("project_tasks")
      .select("id, title, description, status, priority, due_date, assigned_to")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setTasks((data as Task[]) ?? []);
  };

  const loadMembers = async () => {
    if (!projectId) return;
    const { data } = await supabase
      .from("project_members")
      .select("user_id, role, profiles:user_id(full_name, avatar_url)")
      .eq("project_id", projectId);
    setMembers(
      ((data as any[]) ?? []).map((m) => ({
        user_id: m.user_id,
        role: m.role,
        full_name: m.profiles?.full_name ?? "Creative",
        avatar_url: m.profiles?.avatar_url ?? null,
      })),
    );
  };

  const loadCounts = async () => {
    if (!projectId) return;
    const [{ count: deliverables }, { count: meetings }] = await Promise.all([
      supabase.from("project_deliverables").select("*", { count: "exact", head: true }).eq("project_id", projectId),
      supabase.from("project_meetings").select("*", { count: "exact", head: true }).eq("project_id", projectId),
    ]);
    setDeliverableCount(deliverables ?? 0);
    setMeetingCount(meetings ?? 0);
  };

  const loadProject = async () => {
    if (!projectId) return;
    const { data, error } = await supabase
      .from("projects")
      .select("id, title, description, status, created_by, created_at")
      .eq("id", projectId)
      .maybeSingle();
    if (error || !data) {
      toast.error("Project not found");
      navigate("/projects");
      return;
    }
    setProject(data as Project);
    await Promise.all([loadTasks(), loadMembers(), loadCounts()]);
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setCurrentUser(user.id);
      void loadProject();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useRealtimeChannel({
    name: projectId ? `hub-${projectId}` : null,
    onReconnect: () => void loadProject(),
    setup: (channel) =>
      channel
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "project_tasks", filter: `project_id=eq.${projectId}` },
          () => void loadTasks(),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "project_members", filter: `project_id=eq.${projectId}` },
          () => void loadMembers(),
        ),
  });

  const isCreator = !!project && project.created_by === currentUser;
  const done = tasks.filter((t) => t.status === "completed").length;
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const nameFor = useMemo(
    () => (id: string | null) => members.find((m) => m.user_id === id)?.full_name ?? "Unassigned",
    [members],
  );

  const createTask = async () => {
    if (!newTask.title.trim() || !projectId || !currentUser) {
      toast.error("Task title is required");
      return;
    }
    const { error } = await supabase.from("project_tasks").insert({
      project_id: projectId,
      title: newTask.title.trim(),
      description: newTask.description.trim() || null,
      priority: newTask.priority,
      assigned_to: newTask.assigned_to === "unassigned" ? null : newTask.assigned_to,
      created_by: currentUser,
    });
    if (error) {
      toast.error("Failed to create task");
      return;
    }
    setNewTaskOpen(false);
    setNewTask({ title: "", description: "", priority: "medium", assigned_to: "unassigned" });
  };

  const cycleTask = async (task: Task) => {
    const next = task.status === "completed" ? "todo" : task.status === "in_progress" ? "completed" : "in_progress";
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: next } : t)));
    const { error } = await supabase.from("project_tasks").update({ status: next }).eq("id", task.id);
    if (error) {
      toast.error("Could not update the task");
      void loadTasks();
    }
  };

  if (loading || !project || !currentUser) {
    return (
      <AppShell title="Collaboration Hub" back>
        <SkeletonList />
      </AppShell>
    );
  }

  return (
    <AppShell title={project.title} back>
      <div className="space-y-4">
        <Surface inset className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-tight">{project.title}</h1>
              <p className="text-xs text-muted-foreground">
                {project.created_at
                  ? `Started ${formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}`
                  : "Project workspace"}
              </p>
            </div>
            <Badge variant="secondary" className="capitalize">
              {project.status ?? "active"}
            </Badge>
          </div>
          {project.description ? (
            <p className="text-sm leading-relaxed text-muted-foreground">{project.description}</p>
          ) : null}
          <div className="grid grid-cols-4 gap-2">
            <StatBlock label="Members" value={members.length} onClick={() => setTab("members")} />
            <StatBlock label="Tasks" value={`${done}/${tasks.length}`} onClick={() => setTab("tasks")} />
            <StatBlock label="Meetings" value={meetingCount} onClick={() => setTab("meetings")} />
            <StatBlock label="Ships" value={deliverableCount} onClick={() => setTab("deliverables")} />
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </Surface>

        <HScroll>
          {TABS.map((t) => (
            <Chip key={t.key} active={tab === t.key} onClick={() => setTab(t.key)} icon={<t.icon className="h-3.5 w-3.5" />}>
              {t.label}
            </Chip>
          ))}
        </HScroll>

        {tab === "overview" ? (
          <div className="space-y-4">
            <section className="space-y-2">
              <SectionHeader title="Team" subtitle={`${members.length} in the room`} />
              <HScroll>
                {members.map((m) => (
                  <div key={m.user_id} className="flex w-[76px] shrink-0 flex-col items-center gap-1.5">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={m.avatar_url ?? undefined} alt={m.full_name} />
                      <AvatarFallback>{m.full_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="w-full truncate text-center text-[11px] font-medium">{m.full_name.split(" ")[0]}</span>
                  </div>
                ))}
              </HScroll>
            </section>
            <section className="space-y-2">
              <SectionHeader title="Open tasks" subtitle={`${tasks.length - done} still to do`} action={
                <Button size="sm" variant="ghost" onClick={() => setTab("tasks")}>
                  See all
                </Button>
              } />
              {tasks.filter((t) => t.status !== "completed").slice(0, 4).length === 0 ? (
                <EmptyState icon={<ListChecks className="h-6 w-6" />} title="Nothing outstanding" description="Every task in this room is done." />
              ) : (
                <ul className="space-y-2">
                  {tasks
                    .filter((t) => t.status !== "completed")
                    .slice(0, 4)
                    .map((t) => (
                      <li key={t.id}>
                        <ListRow
                          onClick={() => cycleTask(t)}
                          leading={t.status === "in_progress" ? <Clock className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                          title={t.title}
                          subtitle={nameFor(t.assigned_to)}
                        />
                      </li>
                    ))}
                </ul>
              )}
            </section>
            <ActivityFeed projectId={project.id} />
          </div>
        ) : null}

        {tab === "members" ? (
          <div className="space-y-4">
            <ProjectInvites projectId={project.id} currentUserId={currentUser} canInvite={isCreator} />
            <RoleApprovals projectId={project.id} currentUserId={currentUser} isCreator={isCreator} />
            <section className="space-y-2">
              <SectionHeader title="In the room" subtitle={`${members.length} members`} />
              <ul className="space-y-2">
                {members.map((m) => (
                  <li key={m.user_id}>
                    <ListRow
                      onClick={() => navigate(`/profile/${m.user_id}`)}
                      leading={
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={m.avatar_url ?? undefined} alt={m.full_name} />
                          <AvatarFallback>{m.full_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      }
                      title={m.full_name}
                      subtitle={m.role ?? "Member"}
                      chevron
                    />
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : null}

        {tab === "timeline" ? <ActivityFeed projectId={project.id} /> : null}

        {tab === "tasks" ? (
          <section className="space-y-3">
            <SectionHeader
              title="Tasks"
              subtitle={`${done} of ${tasks.length} complete`}
              action={
                <Dialog open={newTaskOpen} onOpenChange={setNewTaskOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-1 h-4 w-4" /> Task
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>New task</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label>Title</Label>
                        <Input value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Description</Label>
                        <Textarea value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>Priority</Label>
                          <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Assignee</Label>
                          <Select value={newTask.assigned_to} onValueChange={(v) => setNewTask({ ...newTask, assigned_to: v })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {members.map((m) => (
                                <SelectItem key={m.user_id} value={m.user_id}>
                                  {m.full_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button className="w-full" onClick={createTask}>
                        Create task
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              }
            />
            {tasks.length === 0 ? (
              <EmptyState icon={<ListChecks className="h-6 w-6" />} title="No tasks yet" description="Break the work down so progress is visible to everyone." />
            ) : (
              <ul className="space-y-2">
                {tasks.map((t) => (
                  <li key={t.id}>
                    <ListRow
                      onClick={() => cycleTask(t)}
                      ariaLabel={`Advance status of ${t.title}`}
                      leading={
                        t.status === "completed" ? (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        ) : t.status === "in_progress" ? (
                          <Clock className="h-5 w-5 text-primary" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )
                      }
                      title={<span className={t.status === "completed" ? "line-through opacity-60" : ""}>{t.title}</span>}
                      subtitle={`${nameFor(t.assigned_to)} · ${t.priority ?? "medium"} priority`}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {tab === "files" ? (
          <div className="space-y-4">
            <ProjectFiles projectId={project.id} currentUserId={currentUser} />
            <ExternalFileLinks projectId={project.id} currentUserId={currentUser} />
          </div>
        ) : null}

        {tab === "meetings" ? <MeetingsPanel projectId={project.id} currentUserId={currentUser} /> : null}
        {tab === "notes" ? <NotesPanel projectId={project.id} currentUserId={currentUser} /> : null}
        {tab === "deliverables" ? (
          <DeliverablesPanel projectId={project.id} currentUserId={currentUser} members={members} />
        ) : null}
      </div>
    </AppShell>
  );
}