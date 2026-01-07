import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Ban } from "lucide-react";

interface UserSuspensionDialogProps {
  userId: string;
  userName: string;
  onSuccess?: () => void;
}

export const UserSuspensionDialog = ({ userId, userName, onSuccess }: UserSuspensionDialogProps) => {
  const [open, setOpen] = useState(false);
  const [suspensionType, setSuspensionType] = useState<"temporary" | "permanent">("temporary");
  const [reason, setReason] = useState("");
  const [expiryDays, setExpiryDays] = useState("7");
  const [loading, setLoading] = useState(false);

  const handleSuspend = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for suspension");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const expiresAt = suspensionType === "temporary"
        ? new Date(Date.now() + parseInt(expiryDays) * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { error } = await supabase.from('user_suspensions').insert({
        user_id: userId,
        suspended_by: user.id,
        reason,
        suspension_type: suspensionType,
        expires_at: expiresAt,
        is_active: true
      });

      if (error) throw error;

      await supabase.from('activity_logs').insert({
        admin_id: user.id,
        action_type: 'user_suspended',
        target_user_id: userId,
        target_user_name: userName,
        details: { reason, suspension_type: suspensionType, expires_at: expiresAt }
      });

      toast.success(`User ${userName} suspended successfully`);
      setOpen(false);
      setReason("");
      setExpiryDays("7");
      onSuccess?.();
    } catch (error) {
      console.error("Suspension error:", error);
      toast.error("Failed to suspend user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Ban className="w-4 h-4 mr-2" />
          Suspend
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suspend User</DialogTitle>
          <DialogDescription>
            Suspend {userName}'s account. They will not be able to access the platform during the suspension period.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Suspension Type</Label>
            <RadioGroup value={suspensionType} onValueChange={(v: any) => setSuspensionType(v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="temporary" id="temporary" />
                <Label htmlFor="temporary">Temporary</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="permanent" id="permanent" />
                <Label htmlFor="permanent">Permanent</Label>
              </div>
            </RadioGroup>
          </div>

          {suspensionType === "temporary" && (
            <div className="space-y-2">
              <Label htmlFor="expiry">Suspension Duration (days)</Label>
              <Input
                id="expiry"
                type="number"
                min="1"
                value={expiryDays}
                onChange={(e) => setExpiryDays(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Suspension *</Label>
            <Textarea
              id="reason"
              placeholder="Enter the reason for suspension..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSuspend} disabled={loading}>
            {loading ? "Suspending..." : "Suspend User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
