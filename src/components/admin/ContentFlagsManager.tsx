import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Flag, Search, Eye, CheckCircle, XCircle, AlertTriangle, RefreshCw, Bell, Undo2, History, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeExternalUrl, UGC_LINK_REL } from '@/lib/safeLinks';
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
  risk_level?: string | null;
  evidence_urls?: string[] | null;
  reporter?: { id: string; full_name: string; email: string | null };
}

interface ModerationAction {
  id: string;
  moderator_id: string;
  content_type: string;
  content_id: string;
  action: string;
  previous_status: string | null;
  new_status: string | null;
  notes: string | null;
  is_bulk: boolean;
  created_at: string;
  moderator?: { full_name: string | null } | null;
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [auditLog, setAuditLog] = useState<ModerationAction[]>([]);
  const [showAudit, setShowAudit] = useState(false);

  useEffect(() => {
    fetchFlags();
    fetchAuditLog();
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
        .select('id, full_name')
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

  const fetchAuditLog = async () => {
    const { data, error } = await supabase
      .from('moderation_actions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return;
    const moderatorIds = [...new Set((data || []).map((a) => a.moderator_id))];
    const { data: mods } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', moderatorIds);
    const modMap = new Map((mods || []).map((m) => [m.id, m]));
    setAuditLog(
      (data || []).map((a) => ({ ...a, moderator: modMap.get(a.moderator_id) ?? null })) as ModerationAction[],
    );
  };

  const logModerationAction = async (
    flag: Pick<ContentFlag, 'id' | 'content_type' | 'content_id' | 'status'>,
    newStatus: string,
    action: string,
    notes: string | null,
    isBulk: boolean,
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('moderation_actions').insert({
      flag_id: flag.id,
      moderator_id: user.id,
      content_type: flag.content_type,
      content_id: flag.content_id,
      action,
      previous_status: flag.status,
      new_status: newStatus,
      notes: notes || null,
      is_bulk: isBulk,
    });
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleBulkAction = async (newStatus: string, shouldUnhide: boolean) => {
    if (selectedIds.length === 0) return;
    setBulkBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const targets = flags.filter((f) => selectedIds.includes(f.id));

      if (shouldUnhide) {
        for (const flag of targets) {
          await unhideContent(flag.content_type, flag.content_id);
        }
      }

      const { error } = await supabase
        .from('content_flags')
        .update({
          status: newStatus,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .in('id', selectedIds);
      if (error) throw error;

      for (const flag of targets) {
        await logModerationAction(
          flag,
          newStatus,
          shouldUnhide ? `bulk_${newStatus}_restored` : `bulk_${newStatus}`,
          null,
          true,
        );
      }

      toast.success(`${targets.length} report(s) marked as ${newStatus}${shouldUnhide ? ' and restored' : ''}`);
      setSelectedIds([]);
      fetchFlags();
      fetchAuditLog();
    } catch (error) {
      console.error('Bulk moderation failed:', error);
      toast.error('Bulk action failed');
    } finally {
      setBulkBusy(false);
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

      if (flag) {
        await logModerationAction(
          flag,
          newStatus,
          shouldUnhide ? `${newStatus}_restored` : newStatus,
          adminNotes,
          false,
        );
      }

      toast.success(`Flag marked as ${newStatus}${shouldUnhide ? ' and content restored' : ''}`);
      setSelectedFlag(null);
      setAdminNotes('');
      fetchFlags();
      fetchAuditLog();
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
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAudit((v) => !v)}>
              <History className="h-4 w-4 mr-2" />
              {showAudit ? 'Hide' : 'Audit'} trail
            </Button>
            <Button variant="outline" size="sm" onClick={() => { fetchFlags(); fetchAuditLog(); }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
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

        {selectedIds.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-3">
            <span className="text-sm font-medium">{selectedIds.length} selected</span>
            {bulkBusy && <Loader2 className="h-4 w-4 animate-spin" />}
            <div className="ml-auto flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" disabled={bulkBusy} onClick={() => handleBulkAction('reviewed', false)}>
                Mark reviewed
              </Button>
              <Button size="sm" disabled={bulkBusy} onClick={() => handleBulkAction('resolved', false)}>
                Resolve
              </Button>
              <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => handleBulkAction('dismissed', false)}>
                Dismiss
              </Button>
              <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => handleBulkAction('dismissed', true)}>
                Dismiss &amp; restore
              </Button>
              <Button size="sm" variant="ghost" disabled={bulkBusy} onClick={() => setSelectedIds([])}>
                Clear
              </Button>
            </div>
          </div>
        )}

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
                <TableHead className="w-10">
                  <Checkbox
                    aria-label="Select all reports"
                    checked={selectedIds.length > 0 && selectedIds.length === filteredFlags.length}
                    onCheckedChange={(checked) =>
                      setSelectedIds(checked ? filteredFlags.map((f) => f.id) : [])
                    }
                  />
                </TableHead>
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
                    <Checkbox
                      aria-label={`Select ${flag.content_type} report`}
                      checked={selectedIds.includes(flag.id)}
                      onCheckedChange={() => toggleSelected(flag.id)}
                    />
                  </TableCell>
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

        {showAudit && (
          <div className="mt-6 rounded-lg border p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <History className="h-4 w-4" />
              Moderation audit trail
            </h3>
            {auditLog.length === 0 ? (
              <p className="text-sm text-muted-foreground">No moderation actions recorded yet.</p>
            ) : (
              <ul className="max-h-72 space-y-2 overflow-y-auto text-sm">
                {auditLog.map((entry) => (
                  <li key={entry.id} className="flex flex-wrap items-center gap-2 border-b pb-2 last:border-0">
                    <Badge variant="outline" className="capitalize">{entry.content_type}</Badge>
                    <span className="font-medium">{entry.moderator?.full_name || 'Admin'}</span>
                    <span className="text-muted-foreground">
                      {entry.previous_status || 'unknown'} → {entry.new_status || 'unknown'} ({entry.action})
                      {entry.is_bulk ? ' · bulk' : ''}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {format(new Date(entry.created_at), 'MMM d, yyyy HH:mm')}
                    </span>
                    {entry.notes && <p className="w-full text-xs text-muted-foreground">{entry.notes}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
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

                {selectedFlag.risk_level && selectedFlag.risk_level !== 'standard' && (
                  <div>
                    <label className="text-sm font-medium">Severity</label>
                    <p>
                      <Badge variant="destructive" className="capitalize">
                        {selectedFlag.risk_level}
                      </Badge>
                    </p>
                  </div>
                )}

                {selectedFlag.description && (
                  <div>
                    <label className="text-sm font-medium">Reporter's Description</label>
                    <p className="text-sm bg-muted p-3 rounded-lg whitespace-pre-wrap">
                      {selectedFlag.description}
                    </p>
                  </div>
                )}

                {(selectedFlag.evidence_urls?.length ?? 0) > 0 && (
                  <div>
                    <label className="text-sm font-medium">Linked evidence</label>
                    <ul className="mt-1 space-y-1">
                      {selectedFlag.evidence_urls!.map((url) => (
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
