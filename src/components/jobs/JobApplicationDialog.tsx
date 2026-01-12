import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Briefcase, MapPin, DollarSign } from "lucide-react";

interface JobPosting {
  id: string;
  title: string;
  description: string;
  location: string | null;
  job_type: string;
  budget_range: string | null;
  required_roles: string[];
  required_skills: string[];
  user_id: string;
  profiles?: {
    full_name: string;
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
}

interface JobApplicationDialogProps {
  job: JobPosting | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  onSuccess?: () => void;
}

export const JobApplicationDialog = ({
  job,
  open,
  onOpenChange,
  currentUserId,
  onSuccess,
}: JobApplicationDialogProps) => {
  const [coverLetter, setCoverLetter] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!job || !currentUserId) return;

    setSubmitting(true);
    
    try {
      // First get the applicant's profile
      const { data: applicantProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", currentUserId)
        .single();

      // Insert the application
      const { data: application, error } = await supabase.from("job_applications").insert({
        job_id: job.id,
        applicant_id: currentUserId,
        cover_letter: coverLetter.trim() || null,
      }).select().single();

      if (error) {
        if (error.code === "23505") {
          toast.error("You've already applied to this job");
        } else {
          toast.error("Failed to submit application");
          console.error(error);
        }
        return;
      }

      // Get job poster's email from auth
      const { data: posterData } = await supabase.auth.admin?.getUserById?.(job.user_id) || {};
      
      // Send email notification via edge function
      try {
        const { error: emailError } = await supabase.functions.invoke("notify-job-application", {
          body: {
            jobTitle: job.title,
            jobPosterEmail: posterData?.user?.email || "unknown@example.com",
            jobPosterName: job.profiles?.full_name || "Creative",
            applicantName: applicantProfile?.full_name || "A creative",
            coverLetter: coverLetter.trim() || undefined,
            applicationId: application.id,
          },
        });

        if (emailError) {
          console.log("Email notification failed (non-blocking):", emailError);
        }
      } catch (emailErr) {
        // Non-blocking - application was still submitted
        console.log("Email notification error (non-blocking):", emailErr);
      }

      toast.success("Application submitted!", {
        description: "The job poster will review your application.",
      });
      setCoverLetter("");
      onOpenChange(false);
      onSuccess?.();
    } finally {
      setSubmitting(false);
    }
  };

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            Apply for Job
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Job summary */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <h3 className="font-semibold text-lg">{job.title}</h3>
            
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={job.profiles?.avatar_url || undefined} />
                <AvatarFallback>{job.profiles?.full_name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">
                Posted by {job.profiles?.full_name || "Unknown"}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{job.job_type}</Badge>
              {job.location && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {job.location}
                </Badge>
              )}
              {job.budget_range && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  {job.budget_range}
                </Badge>
              )}
            </div>
          </div>

          {/* Cover letter */}
          <div className="space-y-2">
            <Label htmlFor="cover-letter">Cover Letter (Optional)</Label>
            <Textarea
              id="cover-letter"
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Introduce yourself and explain why you're a great fit for this opportunity..."
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              A good cover letter helps you stand out from other applicants
            </p>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            {submitting ? "Submitting..." : "Submit Application"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
