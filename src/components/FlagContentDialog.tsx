import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Flag, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FlagContentDialogProps {
  contentType: 'message' | 'portfolio' | 'profile' | 'service' | 'project' | 'project_file';
  contentId: string;
  trigger?: React.ReactNode;
  /** Optional controlled mode, e.g. when opened from a dropdown menu item. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const REASONS = [
  { value: 'spam', label: 'Spam', description: 'Unsolicited promotional content' },
  { value: 'harassment', label: 'Harassment', description: 'Bullying or threatening behavior' },
  { value: 'inappropriate', label: 'Inappropriate Content', description: 'Offensive or explicit material' },
  { value: 'scam', label: 'Scam/Fraud', description: 'Deceptive or fraudulent activity' },
  { value: 'copyright', label: 'Copyright / takedown', description: 'Uses my work or IP without permission' },
  { value: 'other', label: 'Other', description: 'Other violation not listed above' },
];

export const FlagContentDialog = ({
  contentType,
  contentId,
  trigger,
  open: openProp,
  onOpenChange,
}: FlagContentDialogProps) => {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (next: boolean) => {
    setOpenState(next);
    onOpenChange?.(next);
  };
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      toast.error('Please select a reason for reporting');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to report content');
        return;
      }

      const { error } = await supabase.from('content_flags').insert({
        reporter_id: user.id,
        content_type: contentType,
        content_id: contentId,
        reason,
        description: description.trim() || null,
      });

      if (error) throw error;

      toast.success('Report submitted successfully', {
        description: 'Our team will review this content shortly.',
      });
      setOpen(false);
      setReason('');
      setDescription('');
    } catch (error: any) {
      console.error('Error submitting flag:', error);
      toast.error('Failed to submit report', {
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
            <Flag className="h-4 w-4 mr-1" />
            Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Report Content
          </DialogTitle>
          <DialogDescription>
            Help us maintain a safe community by reporting inappropriate content.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label>Reason for reporting</Label>
            <RadioGroup value={reason} onValueChange={setReason} className="space-y-2">
              {REASONS.map((r) => (
                <div key={r.value} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value={r.value} id={r.value} className="mt-0.5" />
                  <div className="grid gap-0.5">
                    <Label htmlFor={r.value} className="font-medium cursor-pointer">
                      {r.label}
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {r.description}
                    </span>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Additional details (optional)</Label>
            <Textarea
              id="description"
              placeholder="Provide any additional context that might help our review..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} variant="destructive">
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
