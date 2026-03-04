import { useState } from "react";
import { ShieldAlert, BadgeCheck, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VerificationBannerProps {
  userId: string;
  isVerified: boolean;
  hasPendingRequest: boolean;
  onRequestSubmitted: () => void;
}

export const VerificationBanner = ({ userId, isVerified, hasPendingRequest, onRequestSubmitted }: VerificationBannerProps) => {
  const [dismissed, setDismissed] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requestType, setRequestType] = useState("identity");
  const [additionalInfo, setAdditionalInfo] = useState("");

  if (isVerified || dismissed) return null;

  if (hasPendingRequest) {
    return (
      <div className="w-full bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-center gap-3">
        <ShieldAlert className="w-6 h-6 text-amber-500 shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-amber-700 dark:text-amber-400">Verification In Progress</p>
          <p className="text-sm text-muted-foreground">
            Your government ID verification is being reviewed. This usually takes 1–3 business days.
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setDismissed(true)}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  const handleSubmit = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('verification_requests')
      .insert({
        user_id: userId,
        request_type: requestType,
        verification_data: { additional_info: additionalInfo, requires_gov_id: true },
        status: 'pending'
      });

    if (error) {
      toast.error('Failed to submit verification request');
    } else {
      toast.success('Verification request submitted! We\'ll review your application soon.');
      setOpen(false);
      onRequestSubmitted();
    }
    setLoading(false);
  };

  return (
    <>
      <div className="w-full bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
        <ShieldAlert className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-destructive">Account Not Verified</p>
          <p className="text-sm text-muted-foreground mt-1">
            Verify your identity with a valid government-issued ID to get the <BadgeCheck className="w-4 h-4 inline text-emerald-500" /> green verification badge. Verified accounts get more visibility, trust, and collaboration opportunities.
          </p>
          <Button
            size="sm"
            className="mt-3 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => setOpen(true)}
          >
            Verify Now
            <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setDismissed(true)}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BadgeCheck className="w-5 h-5 text-emerald-500" />
              Get Verified
            </DialogTitle>
            <DialogDescription>
              Submit your government-issued ID for verification. This helps build trust in the community.
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
                  <SelectItem value="identity">Government ID Verification</SelectItem>
                  <SelectItem value="professional">Professional Credentials + ID</SelectItem>
                  <SelectItem value="artist">Artist Verification + ID</SelectItem>
                  <SelectItem value="producer">Producer Verification + ID</SelectItem>
                  <SelectItem value="label">Label Verification + ID</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Additional Information</Label>
              <Textarea
                placeholder="Provide details about your identity documents, links to official profiles, or any supporting information..."
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                rows={4}
              />
            </div>
            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
              <p className="font-medium mb-1">What you'll need:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>A valid government-issued photo ID (passport, driver's license, or national ID)</li>
                <li>Your ID must match the name on your profile</li>
                <li>Review typically takes 1–3 business days</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {loading ? 'Submitting...' : 'Submit Verification'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
