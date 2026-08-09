import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listCopyrightClaims,
  decideCopyrightClaim,
  type AdminCopyrightClaim,
} from "@/lib/copyright.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageSEO } from "@/components/seo";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2, RefreshCw, Search, ShieldAlert, ExternalLink } from "lucide-react";

const STATUSES = [
  "all",
  "received",
  "reviewing",
  "actioned",
  "rejected",
  "counter_noticed",
  "withdrawn",
] as const;

const statusBadge = (status: string) => {
  if (status === "actioned") return <Badge>Actioned</Badge>;
  if (status === "rejected") return <Badge variant="destructive">Rejected</Badge>;
  if (status === "reviewing") return <Badge variant="secondary">Reviewing</Badge>;
  return <Badge variant="outline">{status.replace(/_/g, " ")}</Badge>;
};

const AdminCopyright = () => {
  const list = useServerFn(listCopyrightClaims);
  const decide = useServerFn(decideCopyrightClaim);

  const [claims, setClaims] = useState<AdminCopyrightClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const [active, setActive] = useState<AdminCopyrightClaim | null>(null);
  const [decision, setDecision] = useState("reviewing");
  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState("");
  const [hideContent, setHideContent] = useState(false);
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    async (status: string) => {
      setLoading(true);
      try {
        setClaims(await list({ data: { status } }));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not load notices.");
      } finally {
        setLoading(false);
      }
    },
    [list],
  );

  useEffect(() => {
    void load(statusFilter);
  }, [load, statusFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return claims;
    return claims.filter((c) =>
      [c.referenceId, c.rightsHolderName, c.contactEmail, c.contentUrl]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [claims, search]);

  const openClaim = (claim: AdminCopyrightClaim) => {
    setActive(claim);
    setDecision(claim.status === "received" ? "reviewing" : claim.status);
    setOutcome(claim.outcome ?? "");
    setNotes(claim.adminNotes ?? "");
    setHideContent(false);
    setNotify(true);
  };

  const save = async () => {
    if (!active) return;
    setSaving(true);
    try {
      await decide({
        data: {
          claimId: active.id,
          status: decision as never,
          ...(outcome.trim() ? { outcome: outcome.trim() } : {}),
          ...(notes.trim() ? { adminNotes: notes.trim() } : {}),
          hideContent,
          notifyClaimant: notify,
        },
      });
      toast.success("Decision recorded and audited.");
      setActive(null);
      await load(statusFilter);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the decision.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageSEO
        title="Copyright notices | ArtistrySynk Admin"
        description="Review and action copyright takedown notices."
        noIndex
      />

      <main className="container mx-auto px-4 py-8 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-primary" aria-hidden="true" />
            Copyright notices
          </h1>
          <p className="text-muted-foreground">
            Every decision is written to the immutable admin audit log with the reference number.
          </p>
        </header>

        <Card>
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <Search
                  className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by AS-CPY reference, name, email or URL"
                  className="pl-9"
                  aria-label="Search copyright notices"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[190px]" aria-label="Filter by status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === "all" ? "All statuses" : s.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => void load(statusFilter)}
                className="gap-2"
                aria-label="Refresh notices"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                Refresh
              </Button>
            </div>
            <CardDescription>
              {loading ? "Loading…" : `${filtered.length} notice(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && (
              <div className="py-10 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" aria-hidden="true" />
              </div>
            )}

            {!loading && filtered.length === 0 && (
              <p className="text-muted-foreground py-8 text-center">No notices match this view.</p>
            )}

            {!loading &&
              filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => openClaim(c)}
                  className="w-full text-left rounded-lg border border-border p-4 hover:border-primary/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs">{c.referenceId}</span>
                    {statusBadge(c.status)}
                    <Badge variant="outline">{c.contentType.replace(/_/g, " ")}</Badge>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {format(new Date(c.createdAt), "d MMM yyyy, HH:mm")}
                    </span>
                  </div>
                  <p className="mt-2 font-medium truncate">{c.rightsHolderName}</p>
                  <p className="text-sm text-muted-foreground truncate">{c.contentUrl}</p>
                </button>
              ))}
          </CardContent>
        </Card>
      </main>

      <Dialog open={Boolean(active)} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono text-base">{active.referenceId}</DialogTitle>
                <DialogDescription>
                  Filed {format(new Date(active.createdAt), "d MMM yyyy, HH:mm")} by{" "}
                  {active.rightsHolderName}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                <div className="grid gap-2 sm:grid-cols-2">
                  <p>
                    <span className="text-muted-foreground">Contact: </span>
                    {active.contactEmail}
                  </p>
                  {active.contactPhone && (
                    <p>
                      <span className="text-muted-foreground">Phone: </span>
                      {active.contactPhone}
                    </p>
                  )}
                </div>

                <p className="flex items-center gap-2 break-all">
                  <a
                    href={active.contentUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-primary underline inline-flex items-center gap-1"
                  >
                    {active.contentUrl}
                    <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  </a>
                </p>

                <div>
                  <p className="text-muted-foreground">Original work</p>
                  <p className="whitespace-pre-wrap">{active.workDescription}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Why it infringes</p>
                  <p className="whitespace-pre-wrap">{active.infringementExplanation}</p>
                </div>

                {active.evidenceUrls.length > 0 && (
                  <div>
                    <p className="text-muted-foreground">Evidence</p>
                    <ul className="list-disc pl-5">
                      {active.evidenceUrls.map((u) => (
                        <li key={u} className="break-all">
                          <a
                            href={u}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-primary underline"
                          >
                            {u}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="space-y-2 pt-2 border-t border-border">
                  <Label htmlFor="cc-decision">Decision</Label>
                  <Select value={decision} onValueChange={setDecision}>
                    <SelectTrigger id="cc-decision">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.filter((s) => s !== "all").map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cc-outcome">Outcome shared with the claimant</Label>
                  <Input
                    id="cc-outcome"
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                    placeholder="e.g. Content removed and uploader warned"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cc-notes">Internal notes</Label>
                  <Textarea
                    id="cc-notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Checkbox
                    id="cc-hide"
                    checked={hideContent}
                    onCheckedChange={(v) => setHideContent(v === true)}
                    disabled={!active.contentId}
                  />
                  <Label htmlFor="cc-hide" className="font-normal">
                    Hide the reported content
                    {!active.contentId && " (no content ID on this notice)"}
                  </Label>
                </div>

                <div className="flex items-center gap-3">
                  <Checkbox
                    id="cc-notify"
                    checked={notify}
                    onCheckedChange={(v) => setNotify(v === true)}
                  />
                  <Label htmlFor="cc-notify" className="font-normal">
                    Email the claimant when actioned or rejected
                  </Label>
                </div>

                <Button onClick={() => void save()} disabled={saving} className="gap-2 min-h-11">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                  {saving ? "Saving…" : "Record decision"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCopyright;
