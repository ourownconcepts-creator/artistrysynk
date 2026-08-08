import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Flag, Search, Eye, CheckCircle, XCircle, AlertTriangle, RefreshCw, Bell, Undo2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useServerFn } from '@tanstack/react-start';
import { notifyContentStatus } from '@/lib/notify-content-status.functions';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ContentFlag {
  id: string;
  reporter_id: string;
  content_type: string;
  content_id: string;
  reason: string;
  description: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  created_at: string;
  reporter?: { id: string; full_name: string; email: string | null };
}

export const ContentFlagsManager = () => {
  const sendContentStatusEmail = useServerFn(notifyContentStatus);
  const [flags, setFlags] = useState<ContentFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedFlag, setSelectedFlag] = useState<ContentFlag | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    fetchFlags();
    setupRealtimeSubscription();
  }, [statusFilter]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('content-flags-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'content_flags',
        },
        (payload) => {
          console.log('New content flag:', payload);
          toast.info('New Content Report', {
            description: `A new ${payload.new.content_type} has been flagged for ${payload.new.reason}`,
            icon: <Bell className="h-4 w-4" />,
            duration: 10000,
          });
          fetchFlags();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'content_flags',
        },
        () => {
          fetchFlags();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchFlags = async () => {
    try {
      let query = supabase
        .from('content_flags')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch reporter profiles
      const reporterIds = [...new Set(data?.map(f => f.reporter_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', reporterIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      const flagsWithReporter = data?.map(flag => ({
        ...flag,
        reporter: profileMap.get(flag.reporter_id),
      })) || [];

      setFlags(flagsWithReporter);
      setPendingCount(flagsWithReporter.filter(f => f.status === 'pending').length);
    } catch (error: any) {
      console.error('Error fetching flags:', error);
      toast.error('Failed to fetch content flags');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (flagId: string, newStatus: string, shouldUnhide: boolean = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const flag = selectedFlag;

      // If dismissing and should unhide, restore the content
      if (shouldUnhide && flag) {
        await unhideContent(flag.content_type, flag.content_id);
        
        // Send notification to user
        try {
          const { data: flagData } = await supabase
            .from('content_flags')
            .select('content_id, content_type')
            .eq('id', flagId)
            .single();

          if (flagData) {
            // Get the content owner
            let ownerId: string | null = null;
            switch (flagData.content_type) {
              case 'portfolio':
                const { data: portfolio } = await supabase
                  .from('portfolio_items')
                  .select('user_id')
                  .eq('id', flagData.content_id)
                  .single();
                ownerId = portfolio?.user_id || null;
                break;
              case 'profile':
                ownerId = flagData.content_id;
                break;
              case 'service':
                const { data: service } = await supabase
                  .from('services')
                  .select('seller_id')
                  .eq('id', flagData.content_id)
                  .single();
                ownerId = service?.seller_id || null;
                break;
              case 'project':
                const { data: project } = await supabase
                  .from('projects')
                  .select('created_by')
                  .eq('id', flagData.content_id)
                  .single();
                ownerId = project?.created_by || null;
                break;
              case 'project_file':
                const { data: projectFile } = await supabase
                  .from('project_files')
                  .select('uploaded_by')
                  .eq('id', flagData.content_id)
                  .single();
                ownerId = projectFile?.uploaded_by || null;
                break;
            }

            if (ownerId) {
              await sendContentStatusEmail({
                data: {
                  userId: ownerId,
                  contentType: flagData.content_type,
                  action: 'restored',
                  adminResponse: adminNotes,
                },
              });
            }
          }
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError);
        }
      }
      
      const { error } = await supabase
        .from('content_flags')
        .update({
          status: newStatus,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes || null,
        })
        .eq('id', flagId);

      if (error) throw error;

      toast.success(`Flag marked as ${newStatus}${shouldUnhide ? ' and content restored' : ''}`);
      setSelectedFlag(null);
      setAdminNotes('');
      fetchFlags();
    } catch (error: any) {
      console.error('Error updating flag:', error);
      toast.error('Failed to update flag status');
    }
  };

  const unhideContent = async (contentType: string, contentId: string) => {
    try {
      let error;
      switch (contentType) {
        case 'message':
          ({ error } = await supabase.from('messages').update({ is_hidden: false }).eq('id', contentId));
          break;
        case 'portfolio':
          ({ error } = await supabase.from('portfolio_items').update({ is_hidden: false }).eq('id', contentId));
          break;
        case 'profile':
          ({ error } = await supabase.from('profiles').update({ is_hidden: false }).eq('id', contentId));
          break;
        case 'service':
          ({ error } = await supabase.from('services').update({ is_hidden: false }).eq('id', contentId));
          break;
        case 'project':
          ({ error } = await supabase.from('projects').update({ is_hidden: false }).eq('id', contentId));
          break;
        case 'project_file':
          ({ error } = await supabase.from('project_files').update({ is_hidden: false }).eq('id', contentId));
          break;
      }
      if (error) throw error;
    } catch (error) {
      console.error('Error unhiding content:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending: { variant: 'destructive', label: 'Pending' },
      reviewed: { variant: 'secondary', label: 'Reviewed' },
      resolved: { variant: 'default', label: 'Resolved' },
      dismissed: { variant: 'outline', label: 'Dismissed' },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getReasonBadge = (reason: string) => {
    const colors: Record<string, string> = {
      spam: 'bg-yellow-100 text-yellow-800',
      harassment: 'bg-red-100 text-red-800',
      inappropriate: 'bg-orange-100 text-orange-800',
      scam: 'bg-purple-100 text-purple-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[reason] || colors.other}`}>
        {reason.charAt(0).toUpperCase() + reason.slice(1)}
      </span>
    );
  };

  const filteredFlags = flags.filter(flag =>
    flag.content_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    flag.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
    flag.reporter?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5" />
              Content Flags
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingCount} pending
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Review and moderate flagged content reported by users</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchFlags}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by content type, reason, or reporter..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading flags...</div>
        ) : filteredFlags.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No content flags found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Content</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Reporter</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFlags.map((flag) => (
                <TableRow key={flag.id}>
                  <TableCell>
                    <div className="font-medium capitalize">{flag.content_type}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                      {flag.content_id}
                    </div>
                  </TableCell>
                  <TableCell>{getReasonBadge(flag.reason)}</TableCell>
                  <TableCell>
                    <div>{flag.reporter?.full_name || 'Unknown'}</div>
                    <div className="text-xs text-muted-foreground">{flag.reporter?.email}</div>
                  </TableCell>
                  <TableCell>{getStatusBadge(flag.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(flag.created_at), 'MMM d, yyyy HH:mm')}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedFlag(flag);
                        setAdminNotes(flag.admin_notes || '');
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Review Dialog */}
        <Dialog open={!!selectedFlag} onOpenChange={() => setSelectedFlag(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Review Content Flag</DialogTitle>
              <DialogDescription>
                Review the flagged content and take appropriate action
              </DialogDescription>
            </DialogHeader>

            {selectedFlag && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Content Type</label>
                    <p className="capitalize">{selectedFlag.content_type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Reason</label>
                    <p>{getReasonBadge(selectedFlag.reason)}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Content ID</label>
                  <p className="text-sm text-muted-foreground break-all">{selectedFlag.content_id}</p>
                </div>

                <div>
                  <label className="text-sm font-medium">Reporter</label>
                  <p>{selectedFlag.reporter?.full_name || 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground">{selectedFlag.reporter?.email}</p>
                </div>

                {selectedFlag.description && (
                  <div>
                    <label className="text-sm font-medium">Reporter's Description</label>
                    <p className="text-sm bg-muted p-3 rounded-lg">{selectedFlag.description}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium">Admin Notes</label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add notes about your review decision..."
                    rows={3}
                  />
                </div>
              </div>
            )}

            <DialogFooter className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => selectedFlag && handleUpdateStatus(selectedFlag.id, 'dismissed', true)}
                className="gap-1"
              >
                <Undo2 className="h-4 w-4" />
                Dismiss & Restore Content
              </Button>
              <Button
                variant="outline"
                onClick={() => selectedFlag && handleUpdateStatus(selectedFlag.id, 'dismissed', false)}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Dismiss (Keep Hidden)
              </Button>
              <Button
                variant="secondary"
                onClick={() => selectedFlag && handleUpdateStatus(selectedFlag.id, 'reviewed', false)}
              >
                <Eye className="h-4 w-4 mr-1" />
                Mark Reviewed
              </Button>
              <Button
                onClick={() => selectedFlag && handleUpdateStatus(selectedFlag.id, 'resolved', false)}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Resolve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
