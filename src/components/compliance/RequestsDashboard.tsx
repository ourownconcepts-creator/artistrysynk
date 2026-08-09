import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { format } from "date-fns";
import { AlertTriangle, ExternalLink, FileText, Loader2, RefreshCw, ScrollText } from "lucide-react";
import {
  listRequestQueues,
  updatePrivacyRequest,
  getEvidenceLink,
  type AdminPrivacyRequest,
  type RequestAuditEntry,
} from "@/lib/compliance-requests.functions";
import {
  listCopyrightClaims,
  decideCopyrightClaim,
  type AdminCopyrightClaim,
} from "@/lib/copyright.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DSAR_STATUSES = ["received", "verifying", "in_progress", "completed", "rejected", "withdrawn"];
const CLAIM_STATUSES = [
  "received",
  "reviewing",
  "actioned",
  "rejected",
  "counter_noticed",
  "withdrawn",
];

const label = (v: string) => v.replace(/_/g, " ");
const when = (iso: string) => format(new Date(iso), "d MMM yyyy HH:mm");

const isLate = (r: AdminPrivacyRequest) =>
  !r.completedAt && new Date(r.responseDueAt).getTime() < Date.now();

/** Admin view for data-subject requests, copyright notices and their audit trail. */
export const RequestsDashboard = () => {
  const loadQueues = useServerFn(listRequestQueues);
  const saveRequest = useServerFn(updatePrivacyRequest);
  const loadClaims = useServerFn(listCopyrightClaims);
  const decide = useServerFn(decideCopyrightClaim);
  const evidenceLink = useServerFn(getEvidenceLink);

  const [requests, setRequests] = useState<AdminPrivacyRequest[]>([]);
  const [audit, setAudit] = useState<RequestAuditEntry[]>([]);
  const [claims, setClaims] = useState<AdminCopyrightClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [queues, claimRows] = await Promise.all([loadQueues(), loadClaims({ data: {} })]);
      setRequests(queues.privacyRequests);
      setAudit(queues.auditTrail);
      setClaims(claimRows);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load the request queues.");
    } finally {
      setLoading(false);
    }
  }, [loadQueues, loadClaims]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const overdue = useMemo(() => requests.filter(isLate).length, [requests]);
  const openClaims = useMemo(
    () => claims.filter((c) => c.status === "received" || c.status === "reviewing").length,
    [claims],
  );

  const setStatus = async (r: AdminPrivacyRequest, status: string) => {
    setBusyId(r.id);
    try {
      const note = notes[r.id]?.trim();
      await saveRequest({
        data: {
          requestId: r.id,
          status: status as never,
          ...(note ? { resolutionNotes: note } : {}),
        },
      });
      toast.success(`${r.referenceId} marked ${label(status)}`);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the request.");
    } finally {
      setBusyId(null);
    }
  };

  const setClaimStatus = async (c: AdminCopyrightClaim, status: string) => {
    setBusyId(c.id);
    try {
      const note = notes[c.id]?.trim();
      await decide({
        data: {
          claimId: c.id,
          status: status as never,
          ...(note ? { adminNotes: note } : {}),
          hideContent: status === "actioned",
          notifyClaimant: true,
        },
      });
      toast.success(`${c.referenceId} marked ${label(status)}`);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the notice.");
    } finally {
      setBusyId(null);
    }
  };

  const openEvidence = async (path: string) => {
    if (/^https?:\/\//.test(path)) {
      window.open(path, "_blank", "noopener");
      return;
    }
    try {
      const url = await evidenceLink({ data: { path } });
      window.open(url, "_blank", "noopener");
    } catch {
      toast.error("Could not open that evidence file.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {requests.length} data-subject request{requests.length === 1 ? "" : "s"} ·{" "}
          {openClaims} open copyright notice{openClaims === 1 ? "" : "s"}
          {overdue > 0 ? ` · ${overdue} past the 30-day deadline` : ""}
        </p>
        <Button variant="outline" onClick={() => void refresh()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <Tabs defaultValue="dsar">
        <TabsList>
          <TabsTrigger value="dsar">Data requests ({requests.length})</TabsTrigger>
          <TabsTrigger value="copyright">Copyright ({claims.length})</TabsTrigger>
          <TabsTrigger value="audit">Audit trail ({audit.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="dsar" className="mt-4 space-y-3">
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data-subject requests yet.</p>
          ) : (
            requests.map((r) => (
              <Card key={r.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="text-base font-mono">{r.referenceId}</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{label(r.requestType)}</Badge>
                      <Badge variant={r.status === "completed" ? "secondary" : "default"}>
                        {label(r.status)}
                      </Badge>
                      {isLate(r) && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" /> overdue
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardDescription>
                    {r.contactEmail} · raised {when(r.createdAt)} · due{" "}
                    {format(new Date(r.responseDueAt), "d MMM yyyy")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {r.details && <p className="text-muted-foreground">{r.details}</p>}
                  {r.resolutionNotes && (
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Resolution: </span>
                      {r.resolutionNotes}
                    </p>
                  )}
                  <div className="space-y-1">
                    <Label htmlFor={`note-${r.id}`}>Resolution note</Label>
                    <Textarea
                      id={`note-${r.id}`}
                      rows={2}
                      value={notes[r.id] ?? ""}
                      onChange={(e) => setNotes((p) => ({ ...p, [r.id]: e.target.value }))}
                      placeholder="What was done, and what was sent to the requester."
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={r.status}
                      onValueChange={(v) => void setStatus(r, v)}
                      disabled={busyId === r.id}
                    >
                      <SelectTrigger className="min-h-11 w-56">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DSAR_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {label(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {busyId === r.id && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="copyright" className="mt-4 space-y-3">
          {claims.length === 0 ? (
            <p className="text-sm text-muted-foreground">No copyright notices filed yet.</p>
          ) : (
            claims.map((c) => (
              <Card key={c.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="text-base font-mono">{c.referenceId}</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{label(c.contentType)}</Badge>
                      <Badge variant={c.status === "actioned" ? "default" : "secondary"}>
                        {label(c.status)}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription>
                    {c.rightsHolderName} · {c.contactEmail} · filed {when(c.createdAt)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="break-all text-muted-foreground">Reported: {c.contentUrl}</p>
                  <p className="text-muted-foreground">{c.infringementExplanation}</p>
                  {c.evidenceUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {c.evidenceUrls.map((e, i) => (
                        <Button
                          key={e}
                          variant="outline"
                          size="sm"
                          onClick={() => void openEvidence(e)}
                        >
                          <FileText className="mr-2 h-3 w-3" /> Evidence {i + 1}
                          <ExternalLink className="ml-2 h-3 w-3" />
                        </Button>
                      ))}
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label htmlFor={`cnote-${c.id}`}>Decision note</Label>
                    <Textarea
                      id={`cnote-${c.id}`}
                      rows={2}
                      value={notes[c.id] ?? ""}
                      onChange={(e) => setNotes((p) => ({ ...p, [c.id]: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={c.status}
                      onValueChange={(v) => void setClaimStatus(c, v)}
                      disabled={busyId === c.id}
                    >
                      <SelectTrigger className="min-h-11 w-56">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CLAIM_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {label(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {busyId === c.id && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ScrollText className="h-4 w-4" aria-hidden="true" /> Decision history
              </CardTitle>
              <CardDescription>
                Append-only record of every privacy and copyright decision, newest first.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {audit.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>
              ) : (
                audit.map((a) => (
                  <div
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 text-sm last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium">
                        {a.action} · <span className="font-mono">{a.targetLabel ?? "—"}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {when(a.createdAt)} · {a.actorRole ?? "staff"}
                        {a.reason ? ` · ${a.reason}` : ""}
                      </p>
                    </div>
                    <Badge variant="outline">{label(a.targetType ?? "")}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
