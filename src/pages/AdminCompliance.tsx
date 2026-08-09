import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  listComplianceRegisters,
  saveComplianceRecord,
  reviewComplianceRecord,
  deleteComplianceRecord,
  type ComplianceRecord,
  type ComplianceRegisters,
} from "@/lib/compliance.functions";
import {
  COMPLIANCE_STATUSES,
  RISK_LEVELS,
  RISK_SCALE,
  approvalBlockers,
  daysUntil,
  fieldsFor,
  isOverdue,
  type ComplianceRecordDraft,
  type ComplianceRecordType,
  type ComplianceStatus,
  type DpiaRisk,
  type RiskLevel,
} from "@/lib/compliance-schema";
import {
  getRetentionOverview,
  runRetentionSweepNow,
  type RetentionOverview,
} from "@/lib/retention.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageSEO } from "@/components/seo";

const emptyDraft = (recordType: ComplianceRecordType): ComplianceRecordDraft => ({
  recordType,
  title: "",
  activity: "",
  owner: "",
  status: "draft",
  reviewDue: null,
  riskLevel: null,
  reviewNotes: "",
  linkedRecordId: null,
  content: recordType === "dpia" ? { risks: [] } : {},
});

const toDraft = (record: ComplianceRecord): ComplianceRecordDraft => ({
  recordType: record.recordType,
  title: record.title,
  activity: record.activity ?? "",
  owner: record.owner ?? "",
  status: record.status,
  reviewDue: record.reviewDue,
  riskLevel: record.riskLevel,
  reviewNotes: record.reviewNotes ?? "",
  linkedRecordId: record.linkedRecordId,
  content: { ...record.content },
});

const statusBadge = (status: ComplianceStatus) => {
  if (status === "approved") return <Badge>Approved</Badge>;
  if (status === "in_review") return <Badge variant="secondary">In review</Badge>;
  if (status === "retired") return <Badge variant="outline">Retired</Badge>;
  return <Badge variant="outline">Draft</Badge>;
};

const AdminCompliance = () => {
  const load = useServerFn(listComplianceRegisters);
  const save = useServerFn(saveComplianceRecord);
  const review = useServerFn(reviewComplianceRecord);
  const remove = useServerFn(deleteComplianceRecord);

  const [registers, setRegisters] = useState<ComplianceRegisters | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"ropa" | "dpia" | "processors">("ropa");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ComplianceRecordDraft | null>(null);
  const [reviewing, setReviewing] = useState<ComplianceRecord | null>(null);
  const [reviewDate, setReviewDate] = useState("");
  const [reviewNote, setReviewNote] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRegisters(await load({ data: undefined }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load registers");
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const records = registers?.records ?? [];
  const ropa = useMemo(() => records.filter((r) => r.recordType === "ropa"), [records]);
  const dpia = useMemo(() => records.filter((r) => r.recordType === "dpia"), [records]);

  const overdue = useMemo(
    () => records.filter((r) => isOverdue(r.reviewDue, r.status)),
    [records],
  );
  const unapproved = useMemo(
    () => records.filter((r) => r.status === "draft" || r.status === "in_review"),
    [records],
  );
  const missingDpia = useMemo(
    () =>
      ropa.filter(
        (activity) =>
          activity.status === "approved" &&
          activity.riskLevel === "high" &&
          !dpia.some((d) => d.linkedRecordId === activity.id && d.status === "approved"),
      ),
    [ropa, dpia],
  );

  const blockers = draft ? approvalBlockers(draft) : [];
  const approvalLocked = Boolean(draft && draft.status === "approved" && blockers.length > 0);

  const openEditor = (recordType: ComplianceRecordType, record?: ComplianceRecord) => {
    setEditingId(record?.id ?? null);
    setDraft(record ? toDraft(record) : emptyDraft(recordType));
  };

  const patch = (updates: Partial<ComplianceRecordDraft>) =>
    setDraft((current) => (current ? { ...current, ...updates } : current));

  const patchContent = (key: string, value: string | DpiaRisk[]) =>
    setDraft((current) =>
      current ? { ...current, content: { ...current.content, [key]: value } } : current,
    );

  const risks = (draft?.content["risks"] as DpiaRisk[] | undefined) ?? [];

  const submit = async () => {
    if (!draft) return;
    if (approvalLocked) {
      toast.error("Resolve the outstanding requirements before approving.");
      return;
    }
    setSaving(true);
    try {
      await save({
        data: {
          ...(editingId ? { id: editingId } : {}),
          recordType: draft.recordType,
          title: draft.title,
          activity: draft.activity || undefined,
          owner: draft.owner || undefined,
          status: draft.status,
          reviewDue: draft.reviewDue,
          riskLevel: draft.riskLevel,
          reviewNotes: draft.reviewNotes || undefined,
          linkedRecordId: draft.linkedRecordId,
          content: draft.content,
        },
      });
      toast.success(editingId ? "Register entry updated" : "Register entry created");
      setDraft(null);
      setEditingId(null);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the record");
    } finally {
      setSaving(false);
    }
  };

  const submitReview = async () => {
    if (!reviewing || !reviewDate) return;
    setSaving(true);
    try {
      await review({
        data: { id: reviewing.id, nextReviewDue: reviewDate, notes: reviewNote || undefined },
      });
      toast.success("Review recorded");
      setReviewing(null);
      setReviewNote("");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not record the review");
    } finally {
      setSaving(false);
    }
  };

  const destroy = async (record: ComplianceRecord) => {
    try {
      await remove({ data: { id: record.id } });
      toast.success("Register entry deleted");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the record");
    }
  };

  const renderRecord = (record: ComplianceRecord) => {
    const due = daysUntil(record.reviewDue);
    const late = isOverdue(record.reviewDue, record.status);
    const gaps = approvalBlockers(toDraft(record));
    return (
      <Card key={record.id} className={late ? "border-destructive/60" : undefined}>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-base">{record.title}</CardTitle>
              <CardDescription className="break-words">
                {record.referenceId} · Owner: {record.owner || "unassigned"}
                {record.activity ? ` · ${record.activity}` : ""}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {statusBadge(record.status)}
              {record.riskLevel && (
                <Badge variant={record.riskLevel === "high" ? "destructive" : "secondary"}>
                  {record.riskLevel} risk
                </Badge>
              )}
              {late && <Badge variant="destructive">Review overdue</Badge>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            {record.reviewDue
              ? `Next review ${format(new Date(record.reviewDue), "d MMM yyyy")}${
                  due !== null && !late ? ` (in ${due} days)` : ""
                }`
              : "No review date set"}
            {record.lastReviewedAt
              ? ` · Last reviewed ${format(new Date(record.lastReviewedAt), "d MMM yyyy")}`
              : ""}
          </p>

          {gaps.length > 0 && record.status !== "retired" && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
              <p className="flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                {gaps.length} requirement{gaps.length === 1 ? "" : "s"} outstanding
              </p>
              <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                {gaps.slice(0, 4).map((gap) => (
                  <li key={gap}>{gap}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => openEditor(record.recordType, record)}>
              Open
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setReviewing(record);
                setReviewDate(record.reviewDue ?? "");
                setReviewNote(record.reviewNotes ?? "");
              }}
            >
              Record review
            </Button>
            {record.status !== "approved" && (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => void destroy(record)}
                aria-label={`Delete ${record.title}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <PageSEO
        title="Compliance registers · Admin"
        description="Records of processing activities and data protection impact assessments."
        noIndex
      />

      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ShieldCheck className="h-6 w-6" /> Compliance registers
          </h1>
          <p className="text-sm text-muted-foreground">
            Processing activities (ROPA), impact assessments (DPIA) and the processor register.
          </p>
        </div>
        <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </header>

      {(overdue.length > 0 || missingDpia.length > 0 || unapproved.length > 0) && (
        <Alert variant={overdue.length || missingDpia.length ? "destructive" : "default"} className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Register attention needed</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5">
              {overdue.length > 0 && <li>{overdue.length} entr{overdue.length === 1 ? "y" : "ies"} past the review date.</li>}
              {missingDpia.length > 0 && (
                <li>
                  {missingDpia.length} high-risk activit{missingDpia.length === 1 ? "y" : "ies"} without an
                  approved impact assessment: {missingDpia.map((r) => r.title).join(", ")}.
                </li>
              )}
              {unapproved.length > 0 && <li>{unapproved.length} entr{unapproved.length === 1 ? "y" : "ies"} not yet approved.</li>}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {loading && !registers ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="ropa">Processing activities ({ropa.length})</TabsTrigger>
            <TabsTrigger value="dpia">Impact assessments ({dpia.length})</TabsTrigger>
            <TabsTrigger value="processors">Processors ({registers?.processors.length ?? 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="ropa" className="mt-4 space-y-4">
            <Button onClick={() => openEditor("ropa")}>
              <Plus className="mr-2 h-4 w-4" /> New processing activity
            </Button>
            {ropa.length === 0 ? (
              <p className="text-sm text-muted-foreground">No processing activities recorded yet.</p>
            ) : (
              ropa.map(renderRecord)
            )}
          </TabsContent>

          <TabsContent value="dpia" className="mt-4 space-y-4">
            <Button onClick={() => openEditor("dpia")}>
              <Plus className="mr-2 h-4 w-4" /> New impact assessment
            </Button>
            {dpia.length === 0 ? (
              <p className="text-sm text-muted-foreground">No impact assessments recorded yet.</p>
            ) : (
              dpia.map(renderRecord)
            )}
          </TabsContent>

          <TabsContent value="processors" className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              {registers?.inventoryCount ?? 0} data-inventory fields and{" "}
              {registers?.retentionCount ?? 0} retention rules are mapped to these processors.
            </p>
            {(registers?.processors ?? []).map((p) => (
              <Card key={p.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="text-base">
                      {p.provider} — {p.service}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Badge variant={p.contractStatus === "dpa_in_place" ? "default" : "outline"}>
                        DPA: {p.contractStatus.replace(/_/g, " ")}
                      </Badge>
                      {!p.isActive && <Badge variant="outline">Inactive</Badge>}
                    </div>
                  </div>
                  <CardDescription>{p.purpose}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  <p>Data accessed: {p.dataAccessed}</p>
                  <p>Location: {p.processingLocation || "not recorded"}</p>
                  <p>Transfer mechanism: {p.transferMechanism || "not recorded"}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}

      {/* Editor */}
      <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit" : "New"}{" "}
              {draft?.recordType === "dpia" ? "impact assessment" : "processing activity"}
            </DialogTitle>
            <DialogDescription>
              Approval is blocked until every register requirement is complete.
            </DialogDescription>
          </DialogHeader>

          {draft && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="cr-title">Title</Label>
                  <Input
                    id="cr-title"
                    value={draft.title}
                    onChange={(e) => patch({ title: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cr-owner">Accountable owner</Label>
                  <Input
                    id="cr-owner"
                    value={draft.owner}
                    onChange={(e) => patch({ owner: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cr-activity">Business area</Label>
                  <Input
                    id="cr-activity"
                    value={draft.activity}
                    onChange={(e) => patch({ activity: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cr-due">Next review date</Label>
                  <Input
                    id="cr-due"
                    type="date"
                    value={draft.reviewDue ?? ""}
                    onChange={(e) => patch({ reviewDue: e.target.value || null })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select
                    value={draft.status}
                    onValueChange={(v) => patch({ status: v as ComplianceStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPLIANCE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Overall risk level</Label>
                  <Select
                    value={draft.riskLevel ?? "unset"}
                    onValueChange={(v) =>
                      patch({ riskLevel: v === "unset" ? null : (v as RiskLevel) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">Not assessed</SelectItem>
                      {RISK_LEVELS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {draft.recordType === "dpia" && (
                <div className="space-y-1">
                  <Label>Processing activity covered</Label>
                  <Select
                    value={draft.linkedRecordId ?? "unset"}
                    onValueChange={(v) => patch({ linkedRecordId: v === "unset" ? null : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Link a ROPA entry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">Not linked</SelectItem>
                      {ropa.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {fieldsFor(draft.recordType).map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label htmlFor={`cr-${field.key}`}>{field.label}</Label>
                  {field.multiline ? (
                    <Textarea
                      id={`cr-${field.key}`}
                      rows={3}
                      value={(draft.content[field.key] as string) ?? ""}
                      onChange={(e) => patchContent(field.key, e.target.value)}
                    />
                  ) : (
                    <Input
                      id={`cr-${field.key}`}
                      value={(draft.content[field.key] as string) ?? ""}
                      onChange={(e) => patchContent(field.key, e.target.value)}
                    />
                  )}
                  <p className="text-xs text-muted-foreground">{field.help}</p>
                </div>
              ))}

              {draft.recordType === "dpia" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Assessed risks</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        patchContent("risks", [
                          ...risks,
                          { risk: "", likelihood: "low", severity: "low", mitigation: "" },
                        ])
                      }
                    >
                      <Plus className="mr-1 h-3 w-3" /> Add risk
                    </Button>
                  </div>
                  {risks.map((risk, index) => (
                    <div key={index} className="space-y-2 rounded-md border border-border p-3">
                      <Input
                        aria-label={`Risk ${index + 1} description`}
                        placeholder="Risk to data subjects"
                        value={risk.risk}
                        onChange={(e) => {
                          const next = [...risks];
                          next[index] = { ...risk, risk: e.target.value };
                          patchContent("risks", next);
                        }}
                      />
                      <div className="grid gap-2 sm:grid-cols-2">
                        {(["likelihood", "severity"] as const).map((dimension) => (
                          <Select
                            key={dimension}
                            value={risk[dimension] || "low"}
                            onValueChange={(v) => {
                              const next = [...risks];
                              next[index] = { ...risk, [dimension]: v };
                              patchContent("risks", next);
                            }}
                          >
                            <SelectTrigger aria-label={`${dimension} for risk ${index + 1}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {RISK_SCALE.map((level) => (
                                <SelectItem key={level} value={level}>
                                  {dimension}: {level}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ))}
                      </div>
                      <Textarea
                        aria-label={`Mitigation for risk ${index + 1}`}
                        rows={2}
                        placeholder="Mitigation / control"
                        value={risk.mitigation}
                        onChange={(e) => {
                          const next = [...risks];
                          next[index] = { ...risk, mitigation: e.target.value };
                          patchContent("risks", next);
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => patchContent("risks", risks.filter((_, i) => i !== index))}
                      >
                        Remove risk
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="cr-notes">Review notes</Label>
                <Textarea
                  id="cr-notes"
                  rows={2}
                  value={draft.reviewNotes}
                  onChange={(e) => patch({ reviewNotes: e.target.value })}
                />
              </div>

              {blockers.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Meets all register
                  requirements — ready to approve.
                </p>
              ) : (
                <Alert variant={draft.status === "approved" ? "destructive" : "default"}>
                  <ClipboardList className="h-4 w-4" />
                  <AlertTitle>Outstanding before approval</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-5">
                      {blockers.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} disabled={saving || approvalLocked}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {approvalLocked ? "Requirements incomplete" : "Save entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Periodic review */}
      <Dialog open={Boolean(reviewing)} onOpenChange={(open) => !open && setReviewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record a review</DialogTitle>
            <DialogDescription>{reviewing?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="rv-date">Next review date</Label>
              <Input
                id="rv-date"
                type="date"
                value={reviewDate}
                onChange={(e) => setReviewDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rv-notes">Notes</Label>
              <Textarea
                id="rv-notes"
                rows={3}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReviewing(null)}>
              Cancel
            </Button>
            <Button onClick={() => void submitReview()} disabled={saving || !reviewDate}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCompliance;
