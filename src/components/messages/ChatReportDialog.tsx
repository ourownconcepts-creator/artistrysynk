import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ReportableMessage = {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
};

/**
 * Structured chat reasons map to a moderation severity so the queue can be
 * triaged without reading every report first.
 */
const REASONS: {
  value: string;
  label: string;
  description: string;
  risk: "standard" | "elevated" | "high" | "urgent";
}[] = [
  {
    value: "harassment",
    label: "Harassment or threats",
    description: "Abuse, bullying, intimidation or threats of violence.",
    risk: "high",
  },
  {
    value: "inappropriate",
    label: "Sexual or explicit content",
    description: "Unwanted sexual messages or explicit media.",
    risk: "high",
  },
  {
    value: "scam",
    label: "Scam, fraud or fake payment",
    description: "Advance-fee requests, fake bookings or payment fraud.",
    risk: "urgent",
  },
  {
    value: "spam",
    label: "Spam or unsolicited promotion",
    description: "Mass messaging, links or promotional pitches.",
    risk: "standard",
  },
  {
    value: "impersonation",
    label: "Impersonation or fake identity",
    description: "Pretending to be another creative, studio or brand.",
    risk: "elevated",
  },
  {
    value: "copyright",
    label: "Copyright or stolen work",
    description: "Sharing or claiming work that is not theirs.",
    risk: "elevated",
  },
  {
    value: "underage",
    label: "Safety risk or minor involved",
    description: "Child safety concerns or immediate danger.",
    risk: "urgent",
  },
  {
    value: "other",
    label: "Something else",
    description: "Anything not covered above — please describe it.",
    risk: "standard",
  },
];

interface ChatReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  targetUserId: string;
  targetUserName: string;
  conversationId: string;
  messages: ReportableMessage[];
}

/** Reports an account from a conversation with reason + linked message evidence. */
export const ChatReportDialog = ({
  open,
  onOpenChange,
  currentUserId,
  targetUserId,
  targetUserName,
  conversationId,
  messages,
}: ChatReportDialogProps) => {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Only the reported person's messages can be used as evidence.
  const theirMessages = useMemo(
    () => messages.filter((m) => m.sender_id === targetUserId).slice(-25).reverse(),
    [messages, targetUserId],
  );

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = async () => {
    if (!reason) {
      toast.error("Choose a reason so moderation can act quickly");
      return;
    }
    setSubmitting(true);

    const risk = REASONS.find((r) => r.value === reason)?.risk ?? "standard";
    const evidenceUrls = selected.map(
      (id) => `${window.location.origin}/messages/${conversationId}#message-${id}`,
    );
    const quoted = selected
      .map((id) => messages.find((m) => m.id === id))
      .filter(Boolean)
      .map((m) => `• ${new Date(m!.created_at).toLocaleString()}: ${m!.content.slice(0, 200)}`)
      .join("\n");

    const details = [
      description.trim(),
      quoted && `Linked messages:\n${quoted}`,
      `Conversation: ${conversationId}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const { error } = await supabase.from("content_flags").insert({
      reporter_id: currentUserId,
      content_type: "profile",
      content_id: targetUserId,
      reason,
      description: details || null,
      risk_level: risk,
      evidence_urls: evidenceUrls,
    });

    setSubmitting(false);

    if (error) {
      toast.error("Could not send your report", { description: error.message });
      return;
    }

    toast.success("Report sent to our safety team", {
      description:
        selected.length > 0
          ? `${selected.length} message${selected.length === 1 ? "" : "s"} attached as evidence.`
          : "We review reports within 24 hours.",
    });
    setReason("");
    setDescription("");
    setSelected([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
            Report {targetUserName}
          </DialogTitle>
          <DialogDescription>
            Pick what happened and attach the messages that show it — reports with evidence are
            actioned fastest.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh] pr-3">
          <div className="space-y-5 py-1">
            <div className="space-y-2">
              <Label>What happened?</Label>
              <RadioGroup value={reason} onValueChange={setReason} className="space-y-2">
                {REASONS.map((r) => (
                  <label
                    key={r.value}
                    htmlFor={`reason-${r.value}`}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-muted/50"
                  >
                    <RadioGroupItem value={r.value} id={`reason-${r.value}`} className="mt-0.5" />
                    <span className="grid gap-0.5">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        {r.label}
                        {(r.risk === "urgent" || r.risk === "high") && (
                          <Badge variant="destructive" className="text-[10px] uppercase">
                            Priority
                          </Badge>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">{r.description}</span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            {theirMessages.length > 0 && (
              <div className="space-y-2">
                <Label>Attach evidence (optional)</Label>
                <p className="text-xs text-muted-foreground">
                  Select messages from {targetUserName.split(" ")[0]}; moderators get a direct link
                  to each one.
                </p>
                <div className="space-y-1 rounded-lg border p-2">
                  {theirMessages.map((m) => (
                    <label
                      key={m.id}
                      htmlFor={`evidence-${m.id}`}
                      className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-muted/50"
                    >
                      <Checkbox
                        id={`evidence-${m.id}`}
                        checked={selected.includes(m.id)}
                        onCheckedChange={() => toggle(m.id)}
                      />
                      <span className="min-w-0 grid gap-0.5">
                        <span className="line-clamp-2 text-sm">{m.content}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(m.created_at).toLocaleString()}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="report-details">Anything else we should know?</Label>
              <Textarea
                id="report-details"
                rows={3}
                maxLength={1000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add context that helps our team review this faster…"
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={submitting || !reason} onClick={() => void submit()}>
            {submitting ? "Sending…" : "Send report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
