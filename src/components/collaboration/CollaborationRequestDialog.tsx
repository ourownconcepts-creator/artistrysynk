import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Handshake } from "lucide-react";

interface Props {
  matchId: string;
  recipientId: string;
  recipientName: string;
  currentUserId: string;
}

const PROJECT_TYPES = [
  "Music Track",
  "Music Video",
  "EP / Album",
  "Film / Short Film",
  "Photography Shoot",
  "Design Project",
  "Fashion Collaboration",
  "Live Performance",
  "Content Creation",
  "Other",
];

export const CollaborationRequestDialog = ({
  matchId,
  recipientId,
  recipientName,
  currentUserId,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectType, setProjectType] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    if (!projectTitle.trim() || !projectType) {
      toast.error("Please fill in project title and type");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("collaboration_requests").insert({
      match_id: matchId,
      sender_id: currentUserId,
      recipient_id: recipientId,
      project_title: projectTitle.trim(),
      project_type: projectType,
      message: message.trim() || null,
    });

    if (error) {
      toast.error("Failed to send collaboration request");
    } else {
      toast.success(`Collaboration invite sent to ${recipientName}!`);
      setOpen(false);
      setProjectTitle("");
      setProjectType("");
      setMessage("");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <Handshake className="w-4 h-4" />
          Collaborate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite to Collaborate</DialogTitle>
          <DialogDescription>
            Send a collaboration request to {recipientName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="project-title">Project Title</Label>
            <Input
              id="project-title"
              placeholder="e.g., Afrobeats EP 2026"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label>Project Type</Label>
            <Select value={projectType} onValueChange={setProjectType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              placeholder="Tell them about your vision..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Sending..." : "Send Invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
