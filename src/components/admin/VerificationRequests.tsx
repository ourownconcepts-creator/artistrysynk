import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface VerificationRequest {
  id: string;
  user_id: string;
  request_type: string;
  status: string;
  created_at: string;
  profiles: { full_name: string; username: string };
}

export const VerificationRequests = () => {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel('verification_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'verification_requests'
      }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRequests = async () => {
    // First fetch verification requests
    const { data: requestsData, error: requestsError } = await supabase
      .from('verification_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (requestsError || !requestsData) {
      setLoading(false);
      return;
    }

    // Then fetch profiles for those users
    const userIds = [...new Set(requestsData.map(r => r.user_id))];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, username')
      .in('id', userIds);

    // Combine the data
    const combined = requestsData.map(request => ({
      ...request,
      profiles: profilesData?.find(p => p.id === request.user_id) || { full_name: 'Unknown', username: 'unknown' }
    }));

    setRequests(combined as any);
    setLoading(false);
  };

  const handleVerification = async (requestId: string, userId: string, status: 'approved' | 'rejected') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('verification_requests')
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (error) {
      toast.error(`Failed to ${status} verification`);
      return;
    }

    // If approved, update the user's profile to set is_verified = true
    if (status === 'approved') {
      await supabase
        .from('profiles')
        .update({ is_verified: true })
        .eq('id', userId);
    }

    // Get request details for email
    const request = requests.find(r => r.id === requestId);
    
    // Send email notification using profile email
    try {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', userId)
        .single();

      if (userProfile?.email && userProfile?.full_name) {
        await supabase.functions.invoke('notify-verification-status', {
          body: {
            email: userProfile.email,
            fullName: userProfile.full_name,
            status,
            requestType: request?.request_type || 'verification',
          }
        });
      }
    } catch (emailError) {
      console.log('Email notification failed, continuing...', emailError);
    }

    await supabase.from('activity_logs').insert({
      admin_id: user.id,
      action_type: `verification_${status}`,
      details: { request_id: requestId, user_id: userId }
    });

    toast.success(`Verification ${status} successfully`);
    fetchRequests();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Verification Requests
        </CardTitle>
        <CardDescription>Review and approve user verification requests</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Loading requests...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{request.profiles?.full_name}</div>
                      <div className="text-sm text-muted-foreground">@{request.profiles?.username}</div>
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{request.request_type}</TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(request.created_at), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                  {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleVerification(request.id, request.user_id, 'approved')}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleVerification(request.id, request.user_id, 'rejected')}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {requests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No verification requests found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
