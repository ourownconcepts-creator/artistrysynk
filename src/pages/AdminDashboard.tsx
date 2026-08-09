import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Users, LogOut, UserX, BarChart3, Flag } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchBar } from "@/components/admin/SearchBar";
import { BulkActions } from "@/components/admin/BulkActions";
import { ActivityLogsViewer } from "@/components/admin/ActivityLogsViewer";
import { AdminNotifications } from "@/components/admin/AdminNotifications";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { DashboardWidgets } from "@/components/admin/DashboardWidgets";
import { ExportData } from "@/components/admin/ExportData";
import { UserSuspensionDialog } from "@/components/admin/UserSuspensionDialog";
import { SessionManagement } from "@/components/admin/SessionManagement";
import { VerificationRequests } from "@/components/admin/VerificationRequests";
import { FeaturedCreativesManager } from "@/components/admin/FeaturedCreativesManager";
import { ContactSubmissionsManager } from "@/components/admin/ContactSubmissionsManager";
import { NewsletterSubscribersManager } from "@/components/admin/NewsletterSubscribersManager";
import { NewsletterCampaign } from "@/components/admin/NewsletterCampaign";
import { JobPostingsManager } from "@/components/admin/JobPostingsManager";
import { CareerApplicationsManager } from "@/components/admin/CareerApplicationsManager";
import { MessagesModeration } from "@/components/admin/MessagesModeration";
import { ContentFlagsManager } from "@/components/admin/ContentFlagsManager";
import { ContentAppealsManager } from "@/components/admin/ContentAppealsManager";
import { useAdminRealtimeNotifications } from "@/hooks/useAdminRealtimeNotifications";
import { PortfolioModeration } from "@/components/admin/PortfolioModeration";
import { MatchManagement } from "@/components/admin/MatchManagement";
import { QuickActionsWidget } from "@/components/admin/QuickActionsWidget";
import { PendingBadge } from "@/components/admin/PendingBadge";
import { useAdminPendingCounts } from "@/hooks/useAdminPendingCounts";
interface UserWithRole {
  id: string;
  full_name: string;
  username: string;
  email?: string;
  role: string;
  created_at?: string | null;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("users");
  
  // Enable realtime notifications for admin
  useAdminRealtimeNotifications();
  
  // Get pending counts for badges
  const { counts } = useAdminPendingCounts();

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

    if (!roles || !roles.some(r => r.role === 'admin')) {
      toast.error('Access denied');
      navigate('/admin-auth');
    }
  };

  const fetchUsers = async () => {
    setLoading(true);

    // Source from profiles so every account is visible, even without a role row
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, username, email, created_at')
      .order('created_at', { ascending: false });

    if (profilesError) {
      toast.error('Failed to fetch users');
      setLoading(false);
      return;
    }

    const ids = (profiles ?? []).map((p) => p.id);
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', ids);

    const formattedUsers: UserWithRole[] = (profiles ?? []).map((p) => ({
      id: p.id,
      full_name: p.full_name || 'Unknown',
      username: p.username || 'unknown',
      email: (p as any).email ?? undefined,
      role: roles?.find((r) => r.user_id === p.id)?.role ?? 'user',
      created_at: p.created_at,
    }));

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

  const handleDeleteUser = async (userId: string, userName: string) => {
    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) {
      toast.error('Failed to delete user');
      return;
    }

    await logActivity('user_deleted', userId, userName);
    toast.success(`User ${userName} deleted successfully`);
    fetchUsers();
  };

  const handleBulkDelete = async () => {
    const userIds = Array.from(selectedUsers);
    for (const userId of userIds) {
      const user = users.find(u => u.id === userId);
      await supabase.auth.admin.deleteUser(userId);
      if (user) await logActivity('bulk_user_deleted', userId, user.full_name);
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
      if (user) await logActivity('bulk_role_change', userId, user.full_name, { to_role: newRole });
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

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/admin-auth');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">Manage regular users</p>
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

        <QuickActionsWidget onTabChange={setActiveTab} />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-6">
          <TabsList className="flex flex-wrap gap-1">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="flags" className="flex items-center">
              <Flag className="h-3 w-3 mr-1" />
              Flags
              <PendingBadge count={counts.flags + counts.appeals} />
            </TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="matches">Matches</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="leads" className="flex items-center">
              Leads
              <PendingBadge count={counts.leads} />
            </TabsTrigger>
            <TabsTrigger value="newsletter">Newsletter</TabsTrigger>
            <TabsTrigger value="featured">Featured</TabsTrigger>
            <TabsTrigger value="jobs" className="flex items-center">
              Jobs
              <PendingBadge count={counts.jobApplications} />
            </TabsTrigger>
            <TabsTrigger value="careers" className="flex items-center">
              Careers
              <PendingBadge count={counts.careers} />
            </TabsTrigger>
            <TabsTrigger value="verifications" className="flex items-center">
              Verify
              <PendingBadge count={counts.verifications} />
            </TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      User Management ({filteredUsers.length})
                    </CardTitle>
                    <CardDescription>View and manage regular users</CardDescription>
                  </div>
                  <ExportData dataType="users" />
                </div>
              </CardHeader>
              <CardContent>
                <SearchBar
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  roleFilter={roleFilter}
                  onRoleFilterChange={setRoleFilter}
                />
                <BulkActions
                  selectedCount={selectedUsers.size}
                  onBulkDelete={handleBulkDelete}
                  onBulkRoleChange={handleBulkRoleChange}
                />
                {loading ? (
                  <p className="text-muted-foreground">Loading users...</p>
                ) : (
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
                            } else {
                              setSelectedUsers(new Set());
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedUsers.has(user.id)}
                            onCheckedChange={() => toggleUserSelection(user.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell>@{user.username}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{user.email || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{user.role}</Badge>
                        </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <UserSuspensionDialog 
                            userId={user.id}
                            userName={user.full_name}
                            onSuccess={fetchUsers}
                          />
                          <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <UserX className="w-4 h-4 mr-2" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete User</AlertDialogTitle>
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
                    {filteredUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          No users found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flags" className="space-y-6">
          <ContentFlagsManager />
          <ContentAppealsManager />
        </TabsContent>

        <TabsContent value="messages">
          <MessagesModeration />
        </TabsContent>

        <TabsContent value="matches">
          <MatchManagement />
        </TabsContent>

        <TabsContent value="portfolio" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-4">
            <div>
              <p className="font-medium">Copyright Notices</p>
              <p className="text-sm text-muted-foreground">
                Takedown notices with decisions, content hiding and audit trail.
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate("/admin-copyright")}>
              Open queue
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-4">
            <div>
              <p className="font-medium">Compliance Registers</p>
              <p className="text-sm text-muted-foreground">
                Processing activities (ROPA), impact assessments (DPIA) and processors.
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate("/admin-compliance")}>
              Open registers
            </Button>
          </div>
          <PortfolioModeration />
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-4">
            <div>
              <p className="font-medium">Support &amp; Privacy Inbox</p>
              <p className="text-sm text-muted-foreground">
                Full inbox with search, status tracking and email replies.
              </p>
            </div>
            <Button onClick={() => navigate("/admin-support")}>Open inbox</Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-4">
            <div>
              <p className="font-medium">Function Run History</p>
              <p className="text-sm text-muted-foreground">
                Runs, statuses and recent errors for support &amp; notification jobs.
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate("/admin-function-logs")}>
              View run history
            </Button>
          </div>
          <ContactSubmissionsManager />
        </TabsContent>

        <TabsContent value="newsletter" className="space-y-6">
          <NewsletterCampaign />
          <NewsletterSubscribersManager />
        </TabsContent>

        <TabsContent value="featured">
          <FeaturedCreativesManager />
        </TabsContent>

        <TabsContent value="jobs">
          <JobPostingsManager />
        </TabsContent>

        <TabsContent value="careers">
          <CareerApplicationsManager />
        </TabsContent>

        <TabsContent value="verifications">
          <VerificationRequests />
        </TabsContent>

        <TabsContent value="sessions">
          <SessionManagement />
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsDashboard />
        </TabsContent>

        <TabsContent value="logs">
          <ActivityLogsViewer />
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
