import { useState, useEffect } from "react";
import { useParams, useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  ArrowLeft, Plus, CheckCircle2, Circle, Clock, Upload, 
  FileText, Users, Calendar, MoreVertical, Link as LinkIcon 
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ExternalFileLinks } from "@/components/projects/ExternalFileLinks";
import { ActivityFeed } from "@/components/projects/ActivityFeed";
import { ProjectInvites } from "@/components/projects/ProjectInvites";
import { RoleApprovals } from "@/components/projects/RoleApprovals";
import { ProjectFiles } from "@/components/projects/ProjectFiles";
import { useHashTarget, PROJECT_ROOM_SECTIONS } from "@/hooks/useHashTarget";

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  created_by: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  assigned_to: string | null;
  created_at: string | null;
}

interface Member {
  user_id: string;
  role: string;
  profiles: {
    full_name: string;
    avatar_url: string;
  };
}

interface ProjectFile {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  created_at: string | null;
}

const CollaborationRoom = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "medium" });

  // Push/in-app deep links target #invites, #role-approvals and #activity.
  useHashTarget(!loading && Boolean(project && currentUser), PROJECT_ROOM_SECTIONS);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setCurrentUser(user.id);
        loadProject();
      }
    });
  }, [projectId, navigate]);

  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`project-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_tasks",
          filter: `project_id=eq.${projectId}`,
        },
        () => loadTasks()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_members",
          filter: `project_id=eq.${projectId}`,
        },
        () => loadMembers()
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "projects",
          filter: `id=eq.${projectId}`,
        },
        () => loadProject()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const loadProject = async () => {
    if (!projectId) return;
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (error || !data) {
      toast.error("Project not found");
      navigate("/projects");
      return;
    }

    setProject(data);
    await Promise.all([loadTasks(), loadMembers()]);
    setLoading(false);
  };

  const loadTasks = async () => {
    if (!projectId) return;
    const { data } = await supabase
      .from("project_tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    setTasks(data || []);
  };

  const loadMembers = async () => {
    if (!projectId) return;
    const { data } = await supabase
      .from("project_members")
      .select(`
        user_id,
        role,
        profiles:user_id(full_name, avatar_url)
      `)
      .eq("project_id", projectId);

    setMembers((data as any) || []);
  };

  const createTask = async () => {
    if (!newTask.title.trim()) {
      toast.error("Task title is required");
      return;
    }

    if (!projectId || !currentUser) return;
    const { error } = await supabase.from("project_tasks").insert({
      project_id: projectId,
      title: newTask.title,
      description: newTask.description,
      priority: newTask.priority,
      created_by: currentUser,
    });

    if (error) {
      toast.error("Failed to create task");
    } else {
      toast.success("Task created");
      setNewTaskOpen(false);
      setNewTask({ title: "", description: "", priority: "medium" });
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    await supabase
      .from("project_tasks")
      .update({ status })
      .eq("id", taskId);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "in_progress": return <Clock className="w-4 h-4 text-blue-500" />;
      default: return <Circle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "default";
      default: return "secondary";
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) return null;

  return (
    <div>
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/projects")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{project.title}</h1>
              <p className="text-muted-foreground">{project.description}</p>
            </div>
          </div>
          <Badge>{project.status}</Badge>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Tasks</CardTitle>
                <Dialog open={newTaskOpen} onOpenChange={setNewTaskOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Task
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Task</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input
                          value={newTask.title}
                          onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                          placeholder="Task title"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={newTask.description}
                          onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                          placeholder="Task description"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Priority</Label>
                        <Select
                          value={newTask.priority}
                          onValueChange={(v) => setNewTask({ ...newTask, priority: v })}
                        >
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
                      <Button onClick={createTask} className="w-full">Create Task</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {tasks.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No tasks yet. Create one to get started!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <button onClick={() => updateTaskStatus(
                          task.id, 
                          task.status === "completed" ? "pending" : "completed"
                        )}>
                          {getStatusIcon(task.status || "pending")}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-sm text-muted-foreground truncate">{task.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant={getPriorityColor(task.priority || "") as any} className="text-xs">
                              {task.priority}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(task.created_at || Date.now()), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        <Select
                          value={task.status || "pending"}
                          onValueChange={(v) => updateTaskStatus(task.id, v)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {currentUser && <ProjectFiles projectId={projectId!} currentUserId={currentUser} />}

            {currentUser && <ExternalFileLinks projectId={projectId!} currentUserId={currentUser} />}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Team Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {members.map((member) => (
                    <div
                      key={member.user_id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/profile/${member.user_id}`)}
                    >
                      <Avatar className="w-10 h-10 border-2 border-primary/20">
                        <AvatarImage src={member.profiles?.avatar_url} />
                        <AvatarFallback>{member.profiles?.full_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{member.profiles?.full_name}</p>
                        {member.role && (
                          <Badge variant="secondary" className="text-xs mt-0.5">{member.role}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {members.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No team members yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {currentUser && (
              <div id="invites" className="scroll-mt-24">
              <ProjectInvites
                projectId={projectId!}
                currentUserId={currentUser}
                canInvite={project?.created_by === currentUser}
              />
              </div>
            )}

            {currentUser && (
              <div id="role-approvals" className="scroll-mt-24">
              <RoleApprovals
                projectId={projectId!}
                currentUserId={currentUser}
                isCreator={project?.created_by === currentUser}
              />
              </div>
            )}

            <div id="activity" className="scroll-mt-24">
              <ActivityFeed projectId={projectId!} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollaborationRoom;
