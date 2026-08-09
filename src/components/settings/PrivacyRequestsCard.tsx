import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listMyPrivacyRequests,
  submitPrivacyRequest,
  type PrivacyRequestRow,
} from "@/lib/privacy-requests.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { FileQuestion, Loader2 } from "lucide-react";
import { LEGAL_CONFIG } from "@/config/legal";

const TYPES: { value: string; label: string }[] = [
  { value: "access", label: "Access a copy of my data" },
  { value: "correction", label: "Correct inaccurate data" },
  { value: "export", label: "Export my data (portability)" },
  { value: "restriction", label: "Restrict how my data is used" },
  { value: "objection", label: "Object to a use of my data" },
  { value: "deletion", label: "Delete my data" },
  { value: "other", label: "Something else" },
];

const STATUS_LABELS: Record<string, string> = {
  received: "Received",
  verifying: "Verifying",
  in_progress: "In progress",
  completed: "Completed",
  rejected: "Closed",
  withdrawn: "Withdrawn",
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });

/** Lets users exercise their data rights and track the response deadline. */
export const PrivacyRequestsCard = () => {
  const send = useServerFn(submitPrivacyRequest);
  const list = useServerFn(listMyPrivacyRequests);

  const [requestType, setRequestType] = useState("access");
  const [details, setDetails] = useState("");
  const [rows, setRows] = useState<PrivacyRequestRow[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setRows(await list());
    } catch {
      /* signed out or offline — the card stays usable */
    }
  }, [list]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const submit = async () => {
    setBusy(true);
    try {
      const row = await send({
        data: { requestType: requestType as never, ...(details.trim() ? { details: details.trim() } : {}) },
      });
      setDetails("");
      await refresh();
      toast.success(`Request received — reference ${row.referenceId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit your request.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileQuestion className="w-5 h-5 text-primary" aria-hidden="true" />
          Your data rights
        </CardTitle>
        <CardDescription>
          Ask us to access, correct, export, restrict or delete your personal data. We respond within
          30 days and confirm everything by email.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="privacy-request-type">What would you like us to do?</Label>
          <Select value={requestType} onValueChange={setRequestType}>
            <SelectTrigger id="privacy-request-type" className="min-h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="privacy-request-details">Anything we should know? (optional)</Label>
          <Textarea
            id="privacy-request-details"
            value={details}
            onChange={(e) => setDetails(e.target.value.slice(0, 2000))}
            placeholder="For example, which information is inaccurate."
            rows={3}
          />
        </div>

        <Button onClick={() => void submit()} disabled={busy} className="gap-2 min-h-11">
          {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          {busy ? "Submitting…" : "Submit request"}
        </Button>

        {rows.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-sm font-medium">Your requests</p>
            <ul className="space-y-2">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="rounded-lg border border-border p-3 text-sm flex flex-wrap items-center gap-2"
                >
                  <span className="font-mono text-xs">{r.referenceId}</span>
                  <span className="text-muted-foreground">
                    {TYPES.find((t) => t.value === r.requestType)?.label ?? r.requestType}
                  </span>
                  <Badge variant={r.status === "completed" ? "secondary" : "outline"}>
                    {STATUS_LABELS[r.status] ?? r.status}
                  </Badge>
                  <span className="text-muted-foreground text-xs ml-auto">
                    Due {formatDate(r.responseDueAt)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Prefer email? Write to {LEGAL_CONFIG.PRIVACY_EMAIL}.
        </p>
      </CardContent>
    </Card>
  );
};
