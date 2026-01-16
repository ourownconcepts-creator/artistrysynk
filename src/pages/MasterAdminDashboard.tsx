import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Shield, Users, LogOut, UserX, UserCog, BarChart3, Flag } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchBar as AdvancedSearchBar } from "@/components/admin/AdvancedSearchBar";
import { BulkActions } from "@/components/admin/BulkActions";
import { ActivityLogsViewer } from "@/components/admin/ActivityLogsViewer";
import { AdminNotifications } from "@/components/admin/AdminNotifications";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { DashboardWidgets } from "@/components/admin/DashboardWidgets";
import { ExportData } from "@/components/admin/ExportData";
import { UserSuspensionDialog } from "@/components/admin/UserSuspensionDialog";
import { SessionManagement } from "@/components/admin/SessionManagement";
import { VerificationRequests } from "@/components/admin/VerificationRequests";
import { MatchManagement } from "@/components/admin/MatchManagement";
import { PortfolioModeration } from "@/components/admin/PortfolioModeration";
import { JobPostingsManager } from "@/components/admin/JobPostingsManager";
import { MarketplaceManager } from "@/components/admin/MarketplaceManager";
import { ProjectsManager } from "@/components/admin/ProjectsManager";
import { CareerApplicationsManager } from "@/components/admin/CareerApplicationsManager";
import { MessagesModeration } from "@/components/admin/MessagesModeration";
import { SwipeAnalytics } from "@/components/admin/SwipeAnalytics";
import { ContentFlagsManager } from "@/components/admin/ContentFlagsManager";
import { useAdminRealtimeNotifications } from "@/hooks/useAdminRealtimeNotifications";
interface UserWithRole {
  id: string;
  full_name: string;
  username: string;
  role: string;
}

const MasterAdminDashboard = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [admins, setAdmins] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | string[]>("all");
  const [dateRange, setDateRange] = useState<any>({ from: undefined, to: undefined });
  
  // Enable realtime notifications for admin
  useAdminRealtimeNotifications();

  useEffect(() => {
    checkAuth();
    fetchUsers();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/admin-auth');
      return;
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id);

    if (!roles || !roles.some(r => r.role === 'master_admin')) {
      toast.error('Access denied');
      navigate('/admin-auth');
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    
    // Fetch user roles first (only user and admin roles)
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('role', ['user', 'admin']);

    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
      toast.error('Failed to fetch users');
      setLoading(false);
      return;
    }

    // Fetch profiles separately
    const userIds = userRoles?.map(ur => ur.user_id) || [];
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, username')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      toast.error('Failed to fetch user profiles');
      setLoading(false);
      return;
    }

    // Combine data
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    const allUsers = userRoles?.map((ur: any) => {
      const profile = profileMap.get(ur.user_id);
      return {
        id: ur.user_id,
        full_name: profile?.full_name || 'Unknown',
        username: profile?.username || 'unknown',
        role: ur.role,
      };
    }) || [];

    setUsers(allUsers.filter(u => u.role === 'user'));
    setAdmins(allUsers.filter(u => u.role === 'admin'));
    setLoading(false);
  };

  const logActivity = async (action: string, targetUserId?: string, targetUserName?: string, details?: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('activity_logs').insert({
      admin_id: user.id,
      action_type: action,
      target_user_id: targetUserId,
      target_user_name: targetUserName,
      details
    });
  };

  const notifyHigherAdmins = async (action: string, targetName: string, details?: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: superAdmins } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'super_admin');

    if (superAdmins) {
      for (const admin of superAdmins) {
        await supabase.from('admin_notifications').insert({
          recipient_admin_id: admin.user_id,
          sender_admin_id: user.id,
          notification_type: action,
          title: `Master Admin Action: ${action}`,
          message: `Master admin performed ${action} on ${targetName}`,
          action_data: details
        });
      }
    }
  };

  const handleRoleChange = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'user' ? 'admin' : 'user';
    const user = [...users, ...admins].find(u => u.id === userId);
    
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole as any })
      .eq('user_id', userId);

    if (error) {
      toast.error('Failed to update role');
      return;
    }

    await logActivity('role_change', userId, user?.full_name, { from_role: currentRole, to_role: newRole });
    await notifyHigherAdmins('role_change', user?.full_name || '', { from_role: currentRole, to_role: newRole });
    toast.success(`User ${newRole === 'admin' ? 'promoted to' : 'demoted from'} admin`);
    fetchUsers();
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) {
      toast.error('Failed to delete user');
      return;
    }

    await logActivity('user_deleted', userId, userName);
    await notifyHigherAdmins('user_deleted', userName);
    toast.success(`User ${userName} deleted successfully`);
    fetchUsers();
  };

  const handleBulkDelete = async () => {
    const userIds = Array.from(selectedUsers);
    for (const userId of userIds) {
      const user = [...users, ...admins].find(u => u.id === userId);
      await supabase.auth.admin.deleteUser(userId);
      if (user) {
        await logActivity('bulk_user_deleted', userId, user.full_name);
        await notifyHigherAdmins('bulk_user_deleted', user.full_name);
      }
    }
    setSelectedUsers(new Set());
    toast.success(`Deleted ${userIds.length} users`);
    fetchUsers();
  };

  const handleBulkRoleChange = async (newRole: string) => {
    const userIds = Array.from(selectedUsers);
    for (const userId of userIds) {
      const user = [...users, ...admins].find(u => u.id === userId);
      await supabase.from('user_roles').update({ role: newRole as any }).eq('user_id', userId);
      if (user) {
        await logActivity('bulk_role_change', userId, user.full_name, { to_role: newRole });
        await notifyHigherAdmins('bulk_role_change', user.full_name, { to_role: newRole });
      }
    }
    setSelectedUsers(new Set());
    toast.success(`Updated ${userIds.length} users to ${newRole}`);
    fetchUsers();
  };

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/admin-auth');
  };

  const allUsersList = [...users, ...admins];
  const filteredUsers = allUsersList.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.username.toLowerCase().includes(searchTerm.toLowerCase());
    
    const selectedRoles = Array.isArray(roleFilter) ? roleFilter : roleFilter === 'all' ? [] : [roleFilter];
    const matchesRole = selectedRoles.length === 0 || selectedRoles.includes(user.role);
    
    return matchesSearch && matchesRole;
  });

  const renderUserTable = (userList: UserWithRole[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">
            <Checkbox
              checked={selectedUsers.size === userList.length && userList.length > 0}
              onCheckedChange={(checked) => {
                if (checked) {
                  setSelectedUsers(new Set(userList.map(u => u.id)));
                } else {
                  setSelectedUsers(new Set());
                }
              }}
            />
          </TableHead>
          <TableHead>Full Name</TableHead>
          <TableHead>Username</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {userList.map((user) => (
          <TableRow key={user.id}>
            <TableCell>
              <Checkbox
                checked={selectedUsers.has(user.id)}
                onCheckedChange={() => toggleUserSelection(user.id)}
              />
            </TableCell>
            <TableCell className="font-medium">{user.full_name}</TableCell>
            <TableCell>@{user.username}</TableCell>
            <TableCell>
              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>{user.role}</Badge>
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRoleChange(user.id, user.role)}
                >
                  <UserCog className="w-4 h-4 mr-2" />
                  {user.role === 'user' ? 'Promote to Admin' : 'Demote to User'}
                </Button>
                <UserSuspensionDialog userId={user.id} userName={user.full_name} />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive">
                      <UserX className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {user.role === 'admin' ? 'Admin' : 'User'}</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {user.full_name}? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteUser(user.id, user.full_name)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </TableCell>
          </TableRow>
        ))}
        {userList.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground">
              No users found
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-primary/5 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
              Master Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">Manage users and admins</p>
          </div>
          <div className="flex gap-2">
            <AdminNotifications />
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        <DashboardWidgets />

        <Tabs defaultValue="management" className="w-full mt-8">
          <TabsList className="grid w-full grid-cols-11">
            <TabsTrigger value="management">Users</TabsTrigger>
            <TabsTrigger value="matches">Matches</TabsTrigger>
            <TabsTrigger value="flags" className="flex items-center gap-1">
              <Flag className="h-3 w-3" />
              Flags
            </TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="jobs">Jobs</TabsTrigger>
            <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="management" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      User & Admin Management
                    </CardTitle>
                    <CardDescription>Manage users and administrators with full control</CardDescription>
                  </div>
                  <ExportData dataType="users" />
                </div>
              </CardHeader>
              <CardContent>
                <AdvancedSearchBar
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  roleFilter={roleFilter}
                  onRoleFilterChange={setRoleFilter}
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                  multiRoleSelect={true}
                />
                <BulkActions
                  selectedCount={selectedUsers.size}
                  onBulkDelete={handleBulkDelete}
                  onBulkRoleChange={handleBulkRoleChange}
                  allowedRoles={['user', 'admin']}
                />
                {loading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : (
                  renderUserTable(filteredUsers)
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="matches" className="mt-6">
            <MatchManagement />
          </TabsContent>

          <TabsContent value="flags" className="mt-6">
            <ContentFlagsManager />
          </TabsContent>

          <TabsContent value="portfolio" className="mt-6">
            <PortfolioModeration />
          </TabsContent>

          <TabsContent value="jobs" className="mt-6">
            <JobPostingsManager />
          </TabsContent>

          <TabsContent value="marketplace" className="mt-6">
            <MarketplaceManager />
          </TabsContent>

          <TabsContent value="projects" className="mt-6">
            <ProjectsManager />
          </TabsContent>

          <TabsContent value="messages" className="mt-6">
            <MessagesModeration />
          </TabsContent>

          <TabsContent value="sessions" className="mt-6">
            <div className="space-y-6">
              <SessionManagement />
              <VerificationRequests />
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <div className="space-y-6">
              <AnalyticsDashboard />
              <SwipeAnalytics />
            </div>
          </TabsContent>

          <TabsContent value="logs" className="mt-6">
            <ActivityLogsViewer />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MasterAdminDashboard;
