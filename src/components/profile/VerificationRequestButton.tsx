import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, Clock, XCircle, BadgeCheck } from "lucide-react";
import { toast } from "sonner";

interface VerificationRequestButtonProps {
  userId: string;
  isVerified: boolean;
}

export const VerificationRequestButton = ({ userId, isVerified }: VerificationRequestButtonProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [existingRequest, setExistingRequest] = useState<any>(null);
  const [requestType, setRequestType] = useState("identity");
  const [additionalInfo, setAdditionalInfo] = useState("");

  useEffect(() => {
    checkExistingRequest();
  }, [userId]);

  const checkExistingRequest = async () => {
    const { data } = await supabase
      .from('verification_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    setExistingRequest(data);
  };

  const handleSubmit = async () => {
    setLoading(true);

    const { error } = await supabase
      .from('verification_requests')
      .insert({
        user_id: userId,
        request_type: requestType,
        verification_data: { additional_info: additionalInfo },
        status: 'pending'
      });

    if (error) {
      toast.error('Failed to submit verification request');
    } else {
      toast.success('Verification request submitted successfully');
      setOpen(false);
      checkExistingRequest();
    }

    setLoading(false);
  };

  if (isVerified) {
    return (
      <Badge variant="default" className="gap-1">
        <BadgeCheck className="w-3 h-3" />
        Verified Account
      </Badge>
    );
  }

  if (existingRequest) {
    const status = existingRequest.status;
    
    if (status === 'pending') {
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="w-3 h-3" />
          Verification Pending
        </Badge>
      );
    }
    
    if (status === 'rejected') {
      return (
        <div className="flex items-center gap-2">
          <Badge variant="destructive" className="gap-1">
            <XCircle className="w-3 h-3" />
            Verification Rejected
          </Badge>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">Reapply</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Verification</DialogTitle>
                <DialogDescription>
                  Submit a new verification request to get your account verified.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Verification Type</Label>
                  <Select value={requestType} onValueChange={setRequestType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="identity">Identity Verification</SelectItem>
                      <SelectItem value="professional">Professional Credentials</SelectItem>
                      <SelectItem value="portfolio">Portfolio Review</SelectItem>
                      <SelectItem value="artist">Artist Verification</SelectItem>
                      <SelectItem value="producer">Producer Verification</SelectItem>
                      <SelectItem value="label">Label Verification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Additional Information</Label>
                  <Textarea
                    placeholder="Provide any additional details to support your verification request..."
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Request'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <BadgeCheck className="w-4 h-4" />
          Get Verified
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Verification</DialogTitle>
          <DialogDescription>
            Submit a verification request to get the verified badge on your profile.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Verification Type</Label>
            <Select value={requestType} onValueChange={setRequestType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="identity">Identity Verification</SelectItem>
                <SelectItem value="professional">Professional Credentials</SelectItem>
                <SelectItem value="portfolio">Portfolio Review</SelectItem>
                <SelectItem value="artist">Artist Verification</SelectItem>
                <SelectItem value="producer">Producer Verification</SelectItem>
                <SelectItem value="label">Label Verification</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Additional Information</Label>
            <Textarea
              placeholder="Provide any additional details to support your verification request..."
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
