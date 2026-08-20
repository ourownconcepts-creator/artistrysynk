import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Search, Eye, CheckCircle, XCircle, RefreshCw, Undo2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeExternalUrl, UGC_LINK_REL } from '@/lib/safeLinks';
import { useServerFn } from '@tanstack/react-start';
import { notifyContentStatus } from '@/lib/notify-content-status.functions';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ContentAppeal {
  id: string;
  user_id: string;
  content_type: string;
  content_id: string;
  appeal_reason: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_response: string | null;
  supporting_info: string | null;
  evidence_urls: string[] | null;
  created_at: string;
  user?: { id: string; full_name: string; email: string | null };
}

export const ContentAppealsManager = () => {
  const sendContentStatusEmail = useServerFn(notifyContentStatus);
  const [appeals, setAppeals] = useState<ContentAppeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAppeal, setSelectedAppeal] = useState<ContentAppeal | null>(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    fetchAppeals();
    setupRealtimeSubscription();
  }, [statusFilter]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('content-appeals-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content_appeals',
        },
        () => {
          fetchAppeals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchAppeals = async () => {
    try {
      let query = supabase
        .from('content_appeals')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch user profiles
      const userIds = [...new Set(data?.map(a => a.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      const appealsWithUser = data?.map(appeal => ({
        ...appeal,
        user: profileMap.get(appeal.user_id),
      })) || [];

      setAppeals(appealsWithUser);
      setPendingCount(appealsWithUser.filter(a => a.status === 'pending').length);
    } catch (error: any) {
      console.error('Error fetching appeals:', error);
      toast.error('Failed to fetch content appeals');
    } finally {
      setLoading(false);
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
      }
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error unhiding content:', error);
      return false;
    }
  };

  const handleResolveAppeal = async (appealId: string, approved: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const appeal = selectedAppeal;
      
      if (!appeal) return;

      // If approved, unhide the content
      if (approved) {
        const unhidden = await unhideContent(appeal.content_type, appeal.content_id);
        if (!unhidden) {
          toast.error('Failed to restore content');
          return;
        }
      }

      // Update appeal status
      const { error } = await supabase
        .from('content_appeals')
        .update({
          status: approved ? 'approved' : 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          admin_response: adminResponse || null,
        })
        .eq('id', appealId);

      if (error) throw error;

      // Send email notification
      try {
        await sendContentStatusEmail({
          data: {
            userId: appeal.user_id,
            contentType: appeal.content_type,
            action: approved ? 'restored' : 'appeal_rejected',
            adminResponse: adminResponse,
          },
        });
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
      }

      toast.success(approved ? 'Appeal approved - content restored' : 'Appeal rejected');
      setSelectedAppeal(null);
      setAdminResponse('');
      fetchAppeals();
    } catch (error: any) {
      console.error('Error resolving appeal:', error);
      toast.error('Failed to resolve appeal');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending: { variant: 'destructive', label: 'Pending' },
      approved: { variant: 'default', label: 'Approved' },
      rejected: { variant: 'outline', label: 'Rejected' },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredAppeals = appeals.filter(appeal =>
    appeal.content_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    appeal.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    appeal.appeal_reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Content Appeals
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingCount} pending
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Review user appeals for hidden content</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAppeals}>
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
              placeholder="Search by content type, user, or reason..."
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
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading appeals...</div>
        ) : filteredAppeals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No content appeals found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Content</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAppeals.map((appeal) => (
                <TableRow key={appeal.id}>
                  <TableCell>
                    <div className="font-medium capitalize">{appeal.content_type}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                      {appeal.content_id}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>{appeal.user?.full_name || 'Unknown'}</div>
                    <div className="text-xs text-muted-foreground">{appeal.user?.email}</div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm truncate max-w-[200px]">{appeal.appeal_reason}</p>
                  </TableCell>
                  <TableCell>{getStatusBadge(appeal.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(appeal.created_at), 'MMM d, yyyy HH:mm')}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedAppeal(appeal);
                        setAdminResponse(appeal.admin_response || '');
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
        <Dialog open={!!selectedAppeal} onOpenChange={() => setSelectedAppeal(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Review Content Appeal</DialogTitle>
              <DialogDescription>
                Review the user's appeal and decide whether to restore their content
              </DialogDescription>
            </DialogHeader>

            {selectedAppeal && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Content Type</label>
                    <p className="capitalize">{selectedAppeal.content_type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <p>{getStatusBadge(selectedAppeal.status)}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Content ID</label>
                  <p className="text-sm text-muted-foreground break-all">{selectedAppeal.content_id}</p>
                </div>

                <div>
                  <label className="text-sm font-medium">User</label>
                  <p>{selectedAppeal.user?.full_name || 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground">{selectedAppeal.user?.email}</p>
                </div>

                <div>
                  <label className="text-sm font-medium">Appeal Reason</label>
                  <p className="text-sm bg-muted p-3 rounded-lg">{selectedAppeal.appeal_reason}</p>
                </div>

                {selectedAppeal.supporting_info && (
                  <div>
                    <label className="text-sm font-medium">Supporting Information</label>
                    <p className="text-sm bg-muted p-3 rounded-lg whitespace-pre-wrap">
                      {selectedAppeal.supporting_info}
                    </p>
                  </div>
                )}

                {selectedAppeal.evidence_urls && selectedAppeal.evidence_urls.length > 0 && (
                  <div>
                    <label className="text-sm font-medium">Evidence Links</label>
                    <ul className="mt-1 space-y-1">
                      {selectedAppeal.evidence_urls.map((url) => (
                        <li key={url}>
                          {sanitizeExternalUrl(url) ? (
                          <a
                            href={sanitizeExternalUrl(url)!}
                            target="_blank"
                            rel={UGC_LINK_REL}
                            className="text-sm text-primary underline break-all"
                          >
                            {url}
                          </a>
                          ) : (
                            <span className="text-sm text-muted-foreground break-all">
                              {url} (link blocked as unsafe)
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedAppeal.status === 'pending' && (
                  <div>
                    <label className="text-sm font-medium">Admin Response (optional)</label>
                    <Textarea
                      value={adminResponse}
                      onChange={(e) => setAdminResponse(e.target.value)}
                      placeholder="Add a response to the user..."
                      rows={3}
                    />
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="flex gap-2">
              {selectedAppeal?.status === 'pending' ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => selectedAppeal && handleResolveAppeal(selectedAppeal.id, false)}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject Appeal
                  </Button>
                  <Button
                    onClick={() => selectedAppeal && handleResolveAppeal(selectedAppeal.id, true)}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve & Restore
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setSelectedAppeal(null)}>
                  Close
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
