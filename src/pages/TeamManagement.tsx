import { useState, useEffect } from "react";
import { useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Users, Crown, UserPlus, Settings, Trash2 } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradePrompt } from "@/components/subscription/UpgradePrompt";

interface Team {
  id: string;
  name: string;
  description: string;
  avatar_url: string;
  owner_id: string;
  created_at: string;
  team_members: TeamMember[];
}

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  profiles: {
    full_name: string;
    avatar_url: string;
    username: string;
  };
}

const TeamManagement = () => {
  const navigate = useNavigate();
  const { isStudio, loading: subLoading } = useSubscription();
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newTeamOpen, setNewTeamOpen] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: "", description: "" });
  const [addMemberOpen, setAddMemberOpen] = useState<string | null>(null);
  const [newMemberUsername, setNewMemberUsername] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("member");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setCurrentUser(user.id);
        loadTeams(user.id);
      }
    });
  }, [navigate]);

  const loadTeams = async (userId: string) => {
    const { data, error } = await supabase
      .from("teams")
      .select("*, team_members(id, user_id, role)")
      .or(`owner_id.eq.${userId}`);

    if (error) {
      console.error("Error loading teams:", error);
    } else {
      setTeams((data || []) as any);
    }
    setLoading(false);
  };

  const createTeam = async () => {
    if (!newTeam.name.trim()) {
      toast.error("Team name is required");
      return;
    }
    if (!currentUser) {
      toast.error("You must be signed in");
      return;
    }

    const { data, error } = await supabase
      .from("teams")
      .insert({
        name: newTeam.name,
        description: newTeam.description,
        owner_id: currentUser,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create team");
    } else {
      // Add owner as a member
      await supabase.from("team_members").insert({
        team_id: data.id,
        user_id: currentUser,
        role: "owner",
      });
      
      toast.success("Team created!");
      setNewTeamOpen(false);
      setNewTeam({ name: "", description: "" });
      loadTeams(currentUser!);
    }
  };

  const addMember = async (teamId: string) => {
    if (!newMemberUsername.trim()) {
      toast.error("Username is required");
      return;
    }

    // Find user by username
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", newMemberUsername)
      .single();

    if (profileError || !profile) {
      toast.error("User not found");
      return;
    }

    const { error } = await supabase.from("team_members").insert({
      team_id: teamId,
      user_id: profile.id,
      role: newMemberRole,
    });

    if (error) {
      if (error.code === "23505") {
        toast.error("User is already a team member");
      } else {
        toast.error("Failed to add member");
      }
    } else {
      toast.success("Member added!");
      setAddMemberOpen(null);
      setNewMemberUsername("");
      setNewMemberRole("member");
      loadTeams(currentUser!);
    }
  };

  const removeMember = async (teamId: string, memberId: string) => {
    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("id", memberId);

    if (error) {
      toast.error("Failed to remove member");
    } else {
      toast.success("Member removed");
      loadTeams(currentUser!);
    }
  };

  const deleteTeam = async (teamId: string) => {
    const { error } = await supabase.from("teams").delete().eq("id", teamId);

    if (error) {
      toast.error("Failed to delete team");
    } else {
      toast.success("Team deleted");
      loadTeams(currentUser!);
    }
  };

  if (loading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isStudio) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-4">
        <div className="max-w-2xl mx-auto py-16">
          <UpgradePrompt
            feature="Team Accounts"
            description="Create and manage team accounts with multiple seats. Perfect for studios, labels, and creative agencies."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-4">
      <div className="max-w-6xl mx-auto py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Team Management
            </h1>
            <p className="text-muted-foreground">Manage your studio and team accounts</p>
          </div>
          <Dialog open={newTeamOpen} onOpenChange={setNewTeamOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Team</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Team Name</Label>
                  <Input
                    value={newTeam.name}
                    onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                    placeholder="e.g., My Studio"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newTeam.description}
                    onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                    placeholder="What does your team do?"
                  />
                </div>
                <Button onClick={createTeam} className="w-full">Create Team</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {teams.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">No teams yet</h2>
              <p className="text-muted-foreground mb-4">
                Create a team to collaborate with your studio members
              </p>
              <Button onClick={() => setNewTeamOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Team
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {teams.map((team) => (
              <Card key={team.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={team.avatar_url} />
                        <AvatarFallback>{team.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {team.name}
                          {team.owner_id === currentUser && (
                            <Badge variant="secondary">
                              <Crown className="w-3 h-3 mr-1" />
                              Owner
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>{team.description}</CardDescription>
                      </div>
                    </div>
                    {team.owner_id === currentUser && (
                      <div className="flex items-center gap-2">
                        <Dialog open={addMemberOpen === team.id} onOpenChange={(open) => setAddMemberOpen(open ? team.id : null)}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <UserPlus className="w-4 h-4 mr-2" />
                              Add Member
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add Team Member</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label>Username</Label>
                                <Input
                                  value={newMemberUsername}
                                  onChange={(e) => setNewMemberUsername(e.target.value)}
                                  placeholder="Enter username"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Role</Label>
                                <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="member">Member</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="manager">Manager</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button onClick={() => addMember(team.id)} className="w-full">
                                Add Member
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => deleteTeam(team.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Team Members ({team.team_members?.length || 0})
                  </h4>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {team.team_members?.map((member) => (
                      <div 
                        key={member.id} 
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={member.profiles?.avatar_url} />
                            <AvatarFallback>
                              {member.profiles?.full_name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{member.profiles?.full_name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                          </div>
                        </div>
                        {team.owner_id === currentUser && member.user_id !== currentUser && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => removeMember(team.id, member.id)}
                          >
                            <Trash2 className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamManagement;