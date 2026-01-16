import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Crown, Users, LogOut, Shield, UserCog, BarChart3, Settings, Flag } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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
import { SubscriptionManager } from "@/components/admin/SubscriptionManager";
import { ProjectsManager } from "@/components/admin/ProjectsManager";
import { CareerApplicationsManager } from "@/components/admin/CareerApplicationsManager";
import { SwipeAnalytics } from "@/components/admin/SwipeAnalytics";
import { RevenueAnalytics } from "@/components/admin/RevenueAnalytics";
import { ContentFlagsManager } from "@/components/admin/ContentFlagsManager";
import { useAdminRealtimeNotifications } from "@/hooks/useAdminRealtimeNotifications";
interface UserWithRole {
  id: string;
  full_name: string;
  username: string;
  role: string;
}

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRole[]>([]);
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

    if (!roles || !roles.some(r => r.role === 'super_admin')) {
      toast.error('Access denied');
      navigate('/admin-auth');
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    
    // Fetch user roles first
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role');

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
    const formattedUsers = userRoles?.map((ur: any) => {
      const profile = profileMap.get(ur.user_id);
      return {
        id: ur.user_id,
        full_name: profile?.full_name || 'Unknown',
        username: profile?.username || 'unknown',
        role: ur.role,
      };
    }) || [];

    setUsers(formattedUsers);
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

  const sendEmailNotification = async (action: string, targetName: string, details?: string) => {
    try {
      await supabase.functions.invoke('send-admin-notification', {
        body: {
          recipientEmail: 'admin@example.com', // Replace with actual admin email
          adminName: 'Super Admin',
          action,
          targetUser: targetName,
          details
        }
      });
    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  };

  const handleRoleChange = async (userId: string, newRole: "user" | "admin" | "master_admin" | "super_admin") => {
    const user = users.find(u => u.id === userId);
    const oldRole = user?.role;

    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('user_id', userId);

    if (error) {
      toast.error('Failed to update role');
      return;
    }

    await logActivity('role_change', userId, user?.full_name, { from_role: oldRole, to_role: newRole });
    await sendEmailNotification('Role Change', user?.full_name || '', `Changed from ${oldRole} to ${newRole}`);
    toast.success('Role updated successfully');
    fetchUsers();
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) {
      toast.error('Failed to delete user');
      return;
    }

    await logActivity('user_deleted', userId, userName);
    await sendEmailNotification('User Deletion', userName, 'User account permanently deleted');
    toast.success('User deleted successfully');
    fetchUsers();
  };

  const handleBulkDelete = async () => {
    const userIds = Array.from(selectedUsers);
    for (const userId of userIds) {
      const user = users.find(u => u.id === userId);
      await supabase.auth.admin.deleteUser(userId);
      if (user) {
        await logActivity('bulk_user_deleted', userId, user.full_name);
        await sendEmailNotification('Bulk Deletion', user.full_name, 'Deleted as part of bulk action');
      }
    }
    setSelectedUsers(new Set());
    toast.success(`Deleted ${userIds.length} users`);
    fetchUsers();
  };

  const handleBulkRoleChange = async (newRole: string) => {
    const userIds = Array.from(selectedUsers);
    for (const userId of userIds) {
      const user = users.find(u => u.id === userId);
      await supabase.from('user_roles').update({ role: newRole as any }).eq('user_id', userId);
      if (user) {
        await logActivity('bulk_role_change', userId, user.full_name, { to_role: newRole });
        await sendEmailNotification('Bulk Role Change', user.full_name, `Changed to ${newRole}`);
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

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'default';
      case 'master_admin':
        return 'default';
      case 'admin':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const filteredUsers = users.filter(user => {
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
          <TableHead>Current Role</TableHead>
          <TableHead>Change Role</TableHead>
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
              <Badge variant={getRoleBadgeVariant(user.role)}>
                {user.role.replace('_', ' ')}
              </Badge>
            </TableCell>
            <TableCell>
              <Select
                value={user.role}
                onValueChange={(value) => handleRoleChange(user.id, value as "user" | "admin" | "master_admin" | "super_admin")}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">
                    <span className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      User
                    </span>
                  </SelectItem>
                  <SelectItem value="admin">
                    <span className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Admin
                    </span>
                  </SelectItem>
                  <SelectItem value="master_admin">
                    <span className="flex items-center gap-2">
                      <UserCog className="w-4 h-4" />
                      Master Admin
                    </span>
                  </SelectItem>
                  <SelectItem value="super_admin">
                    <span className="flex items-center gap-2">
                      <Crown className="w-4 h-4" />
                      Super Admin
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                <UserSuspensionDialog userId={user.id} userName={user.full_name} />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive">
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete User</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {user.full_name} ({user.role.replace('_', ' ')})? 
                        This action cannot be undone and will permanently remove all associated data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleDeleteUser(user.id, user.full_name)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete Permanently
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
            <TableCell colSpan={6} className="text-center text-muted-foreground">
              No users found
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-accent/5 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-secondary via-accent to-primary bg-clip-text text-transparent">
              Super Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">Complete system control</p>
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
          <TabsList className="flex flex-wrap gap-1">
            <TabsTrigger value="management">Users</TabsTrigger>
            <TabsTrigger value="matches">Matches</TabsTrigger>
            <TabsTrigger value="flags" className="flex items-center gap-1">
              <Flag className="h-3 w-3" />
              Flags
            </TabsTrigger>
            <TabsTrigger value="jobs">Jobs</TabsTrigger>
            <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="careers">Careers</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="management" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="w-5 h-5" />
                      Complete User Management
                    </CardTitle>
                    <CardDescription>Manage all users, admins, master admins, and super admins</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <ExportData dataType="users" />
                    <Button variant="outline" onClick={() => navigate("/admin-settings")}>
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Button>
                  </div>
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
                  allowedRoles={['user', 'admin', 'master_admin', 'super_admin']}
                />
                {loading ? (
                  <p className="text-muted-foreground">Loading users...</p>
                ) : (
                  <Tabs defaultValue="all" className="w-full mt-4">
                    <TabsList className="grid w-full grid-cols-5">
                      <TabsTrigger value="all">All ({users.length})</TabsTrigger>
                      <TabsTrigger value="users">Users ({users.filter(u => u.role === 'user').length})</TabsTrigger>
                      <TabsTrigger value="admins">Admins ({users.filter(u => u.role === 'admin').length})</TabsTrigger>
                      <TabsTrigger value="master">Master ({users.filter(u => u.role === 'master_admin').length})</TabsTrigger>
                      <TabsTrigger value="super">Super ({users.filter(u => u.role === 'super_admin').length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="all" className="mt-4">
                      {renderUserTable(filteredUsers)}
                    </TabsContent>
                    <TabsContent value="users" className="mt-4">
                      {renderUserTable(filteredUsers.filter(u => u.role === 'user'))}
                    </TabsContent>
                    <TabsContent value="admins" className="mt-4">
                      {renderUserTable(filteredUsers.filter(u => u.role === 'admin'))}
                    </TabsContent>
                    <TabsContent value="master" className="mt-4">
                      {renderUserTable(filteredUsers.filter(u => u.role === 'master_admin'))}
                    </TabsContent>
                    <TabsContent value="super" className="mt-4">
                      {renderUserTable(filteredUsers.filter(u => u.role === 'super_admin'))}
                    </TabsContent>
                  </Tabs>
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

          <TabsContent value="jobs" className="mt-6">
            <JobPostingsManager />
          </TabsContent>

          <TabsContent value="marketplace" className="mt-6">
            <MarketplaceManager />
          </TabsContent>

          <TabsContent value="projects" className="mt-6">
            <ProjectsManager />
          </TabsContent>

          <TabsContent value="subscriptions" className="mt-6">
            <SubscriptionManager />
          </TabsContent>

          <TabsContent value="portfolio" className="mt-6">
            <PortfolioModeration />
          </TabsContent>

          <TabsContent value="careers" className="mt-6">
            <CareerApplicationsManager />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <div className="space-y-6">
              <SwipeAnalytics />
              <RevenueAnalytics />
              <AnalyticsDashboard />
            </div>
          </TabsContent>

          <TabsContent value="sessions" className="mt-6">
            <div className="space-y-6">
              <SessionManagement />
              <VerificationRequests />
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

export default SuperAdminDashboard;
