import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ContentAppealsFormProps {
  contentType: 'message' | 'portfolio' | 'profile' | 'service' | 'project' | 'project_file';
  contentId: string;
  trigger?: React.ReactNode;
}

export const ContentAppealsForm = ({ contentType, contentId, trigger }: ContentAppealsFormProps) => {
  const [open, setOpen] = useState(false);
  const [appealReason, setAppealReason] = useState('');
  const [supportingInfo, setSupportingInfo] = useState('');
  const [evidenceInput, setEvidenceInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const evidenceUrls = evidenceInput
    .split(/[\s,]+/)
    .map((u) => u.trim())
    .filter((u) => /^https?:\/\//i.test(u));

  const handleSubmit = async () => {
    if (!appealReason.trim()) {
      toast.error('Please provide a reason for your appeal');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to submit an appeal');
        return;
      }

      // Check if appeal already exists
      const { data: existingAppeal } = await supabase
        .from('content_appeals')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('content_type', contentType)
        .eq('content_id', contentId)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingAppeal) {
        toast.error('You already have a pending appeal for this content');
        return;
      }

      const { error } = await supabase
        .from('content_appeals')
        .insert({
          user_id: user.id,
          content_type: contentType,
          content_id: contentId,
          appeal_reason: appealReason.trim(),
          supporting_info: supportingInfo.trim() || null,
          evidence_urls: evidenceUrls,
        });

      if (error) throw error;

      toast.success('Appeal submitted successfully', {
        description: 'An admin will review your appeal shortly.',
      });
      setOpen(false);
      setAppealReason('');
      setSupportingInfo('');
      setEvidenceInput('');
    } catch (error: any) {
      console.error('Error submitting appeal:', error);
      toast.error('Failed to submit appeal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Appeal Hiding
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Appeal Content Hiding
          </DialogTitle>
          <DialogDescription>
            Your {contentType} has been temporarily hidden due to reports. 
            Submit an appeal if you believe this was done in error.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium">Why should this content be restored?</label>
            <Textarea
              value={appealReason}
              onChange={(e) => setAppealReason(e.target.value)}
              placeholder="Explain why you believe your content should be restored..."
              rows={4}
              className="mt-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="appeal-supporting">
              Supporting information (optional)
            </label>
            <Textarea
              id="appeal-supporting"
              value={supportingInfo}
              onChange={(e) => setSupportingInfo(e.target.value)}
              placeholder="Licence details, ownership proof, context about the report..."
              rows={3}
              className="mt-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="appeal-evidence">
              Evidence links (optional)
            </label>
            <Input
              id="appeal-evidence"
              value={evidenceInput}
              onChange={(e) => setEvidenceInput(e.target.value)}
              placeholder="https://... (separate multiple links with spaces or commas)"
              className="mt-2"
            />
            {evidenceInput.trim() && (
              <p className="mt-1 text-xs text-muted-foreground">
                {evidenceUrls.length} valid link{evidenceUrls.length === 1 ? '' : 's'} detected
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Your appeal will be reviewed by an administrator. 
            You will be notified via email once a decision is made.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Appeal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
