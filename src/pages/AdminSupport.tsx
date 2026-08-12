import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { sendSupportReply as sendSupportReplyFn } from "@/lib/send-support-reply.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageSEO } from "@/components/seo";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ArrowLeft, Clock, CheckCircle, XCircle, Eye, RefreshCw, Search,
  Mail, Send, Shield, LifeBuoy, Loader2,
} from "lucide-react";

type Ticket = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: string;
  category: string | null;
  reference_id: string | null;
  admin_response: string | null;
  responded_at: string | null;
  created_at: string;
};

type AuditEntry = {
  id: string;
  outcome: string;
  reject_reason: string | null;
  ip_hash: string | null;
  user_agent: string | null;
  captcha_required: boolean;
  captcha_passed: boolean | null;
  validation_results: unknown;
  created_at: string;
};

const fallbackReference = (t: Ticket) =>
  `AS-${(t.category ?? "support") === "privacy" ? "PRV" : "SUP"}-${t.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;

const referenceOf = (t: Ticket) => t.reference_id ?? fallbackReference(t);

const STATUSES = ["pending", "reviewed", "resolved", "spam"] as const;

const statusBadge = (status: string) => {
  switch (status) {
    case "pending":
      return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" aria-hidden="true" />Pending</Badge>;
    case "reviewed":
      return <Badge variant="secondary" className="gap-1"><Eye className="w-3 h-3" aria-hidden="true" />Reviewed</Badge>;
    case "resolved":
      return <Badge className="gap-1"><CheckCircle className="w-3 h-3" aria-hidden="true" />Resolved</Badge>;
    case "spam":
      return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" aria-hidden="true" />Spam</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const AdminSupport = () => {
  const navigate = useNavigate();
  const sendSupportReply = useServerFn(sendSupportReplyFn);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [active, setActive] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");
  const [replyStatus, setReplyStatus] = useState<"pending" | "reviewed" | "resolved" | "spam">("resolved");
  const [sending, setSending] = useState(false);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [inboxes, setInboxes] = useState({ support: "", privacy: "" });
  const [savingInboxes, setSavingInboxes] = useState(false);

  const fetchInboxes = async () => {
    const { data } = await supabase
      .from("admin_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["support_inbox_email", "privacy_inbox_email"]);
    const read = (key: string) => {
      const value = data?.find((r) => r.setting_key === key)?.setting_value;
      return typeof value === "string" ? value : "";
    };
    setInboxes({ support: read("support_inbox_email"), privacy: read("privacy_inbox_email") });
  };

  const saveInboxes = async () => {
    const valid = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim());
    if (!valid(inboxes.support) || !valid(inboxes.privacy)) {
      toast.error("Enter a valid email address for both inboxes");
      return;
    }
    setSavingInboxes(true);
    const { error } = await supabase.from("admin_settings").upsert(
      [
        { setting_key: "support_inbox_email", setting_value: inboxes.support.trim() as unknown as never },
        { setting_key: "privacy_inbox_email", setting_value: inboxes.privacy.trim() as unknown as never },
      ],
      { onConflict: "setting_key" },
    );
    setSavingInboxes(false);
    if (error) {
      toast.error("Failed to save inbox routing", { description: error.message });
      return;
    }
    toast.success("Inbox routing updated");
  };

  const fetchAudit = async (ticket: Ticket) => {
    setAudit([]);
    const { data } = await supabase
      .from("contact_submission_audit")
      .select("*")
      .or(`submission_id.eq.${ticket.id},reference_id.eq.${referenceOf(ticket)}`)
      .order("created_at", { ascending: false });
    setAudit((data ?? []) as unknown as AuditEntry[]);
  };

  const fetchTickets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contact_submissions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to load submissions");
      console.error(error);
    } else {
      setTickets((data ?? []) as unknown as Ticket[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
    fetchInboxes();
  }, []);

  const counts = useMemo(() => {
    const base: Record<string, number> = { all: tickets.length, pending: 0, reviewed: 0, resolved: 0, spam: 0 };
    tickets.forEach((t) => {
      base[t.status] = (base[t.status] ?? 0) + 1;
    });
    return base;
  }, [tickets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (categoryFilter !== "all" && (t.category ?? "support") !== categoryFilter) return false;
      if (!q) return true;
      return [t.name, t.email, t.subject, t.message, t.phone ?? "", referenceOf(t)]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [tickets, search, statusFilter, categoryFilter]);

  const openTicket = (ticket: Ticket) => {
    setActive(ticket);
    setReply(ticket.admin_response ?? "");
    setReplyStatus(ticket.status === "pending" ? "resolved" : (ticket.status as "reviewed" | "resolved" | "spam"));
    fetchAudit(ticket);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("contact_submissions").update({ status }).eq("id", id);
    if (error) {
      toast.error("Failed to update status");
      return;
    }
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    setActive((prev) => (prev && prev.id === id ? { ...prev, status } : prev));
    toast.success("Status updated");
  };

  const sendReply = async () => {
    if (!active) return;
    if (reply.trim().length < 2) {
      toast.error("Write a reply before sending");
      return;
    }
    setSending(true);
    try {
      await sendSupportReply({
        data: { submissionId: active.id, reply: reply.trim(), status: replyStatus as "pending" | "resolved" | "reviewed" | "spam" },
      });
    } catch (error) {
      const details = error instanceof Error ? error.message : "Unknown error";
      console.error("send-support-reply failed:", details);
      toast.error("Failed to send reply", { description: details });
      setSending(false);
      return;
    }
    setSending(false);

    toast.success(`Reply sent to ${active.email}`);
    const now = new Date().toISOString();
    setTickets((prev) =>
      prev.map((t) =>
        t.id === active.id ? { ...t, admin_response: reply.trim(), responded_at: now, status: replyStatus } : t
      )
    );
    setActive(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageSEO
        title="Support Inbox | ArtistrySynk Admin"
        description="Admin inbox to review, search, and respond to support and privacy requests."
        noIndex
      />
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} aria-label="Back to admin dashboard">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Support &amp; Privacy Inbox</h1>
            <p className="text-sm text-muted-foreground">
              Review and reply to support tickets, and action chat safety reports from one place.
            </p>
          </div>
        </div>

        <Tabs defaultValue="tickets" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="tickets">Support tickets</TabsTrigger>
            <TabsTrigger value="safety">Chat safety reports</TabsTrigger>
          </TabsList>
          <TabsContent value="tickets" className="space-y-6">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {(["pending", "reviewed", "resolved", "spam"] as const).map((s) => (
            <Card key={s}>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground capitalize">{s}</p>
                <p className="text-2xl font-bold">{counts[s] ?? 0}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Inbox routing</CardTitle>
            <CardDescription>
              Where new submissions are forwarded. Support tickets go to the first address, privacy requests to the second.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <div>
                <label htmlFor="support-inbox" className="text-sm font-medium mb-2 block">Support inbox</label>
                <Input
                  id="support-inbox"
                  type="email"
                  placeholder="support@artistrysynk.app"
                  value={inboxes.support}
                  onChange={(e) => setInboxes((p) => ({ ...p, support: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="privacy-inbox" className="text-sm font-medium mb-2 block">Privacy inbox</label>
                <Input
                  id="privacy-inbox"
                  type="email"
                  placeholder="privacy@artistrysynk.app"
                  value={inboxes.privacy}
                  onChange={(e) => setInboxes((p) => ({ ...p, privacy: e.target.value }))}
                />
              </div>
              <Button onClick={saveInboxes} disabled={savingInboxes}>
                {savingInboxes ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />Saving…</>
                ) : (
                  "Save routing"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-end gap-3 lg:justify-between">
              <div>
                <CardTitle>Tickets ({filtered.length})</CardTitle>
                <CardDescription>Newest first</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    className="pl-9 w-[240px]"
                    placeholder="Search reference, name, email…"
                    aria-label="Search tickets by reference ID, name, email or subject"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]" aria-label="Filter by status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[150px]" aria-label="Filter by category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                    <SelectItem value="privacy">Privacy</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={fetchTickets} aria-label="Refresh tickets">
                  <RefreshCw className="w-4 h-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground py-8 text-center">Loading tickets…</p>
            ) : filtered.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">No tickets match your filters</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Replied</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {format(new Date(t.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="font-mono text-xs whitespace-nowrap">{referenceOf(t)}</TableCell>
                        <TableCell>
                          <div className="font-medium">{t.name}</div>
                          <a href={`mailto:${t.email}`} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                            <Mail className="w-3 h-3" aria-hidden="true" />
                            {t.email}
                          </a>
                        </TableCell>
                        <TableCell>
                          {(t.category ?? "support") === "privacy" ? (
                            <Badge variant="secondary" className="gap-1"><Shield className="w-3 h-3" aria-hidden="true" />Privacy</Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1"><LifeBuoy className="w-3 h-3" aria-hidden="true" />Support</Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[240px] truncate">{t.subject}</TableCell>
                        <TableCell>{statusBadge(t.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {t.responded_at ? format(new Date(t.responded_at), "MMM d") : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <Select value={t.status} onValueChange={(v) => updateStatus(t.id, v)}>
                              <SelectTrigger className="w-[130px]" aria-label={`Change status for ${t.subject}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUSES.map((s) => (
                                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button size="sm" variant="outline" onClick={() => openTicket(t)} aria-label={`Open and reply to ${t.subject}`}>
                              Open
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>
          <TabsContent value="safety">
            <ContentFlagsManager />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="max-w-2xl">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle>{active.subject}</DialogTitle>
                <DialogDescription>
                  <span className="font-mono">{referenceOf(active)}</span> · {active.name} · {active.email}
                  {active.phone ? ` · ${active.phone}` : ""} ·{" "}
                  {format(new Date(active.created_at), "MMM d, yyyy HH:mm")}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="p-4 bg-muted rounded-lg max-h-48 overflow-y-auto">
                  <p className="whitespace-pre-wrap text-sm">{active.message}</p>
                </div>

                {audit.length > 0 && (
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-sm font-medium mb-2">Submission audit trail</p>
                    <ul className="space-y-2 text-xs text-muted-foreground">
                      {audit.map((a) => (
                        <li key={a.id} className="border-b border-border/50 pb-2 last:border-0 last:pb-0">
                          <span className="font-medium text-foreground capitalize">{a.outcome.replace(/_/g, " ")}</span>
                          {a.reject_reason ? ` · ${a.reject_reason}` : ""} · {format(new Date(a.created_at), "MMM d, yyyy HH:mm:ss")}
                          <div className="font-mono break-all">IP hash: {a.ip_hash?.slice(0, 16) ?? "—"}…</div>
                          <div className="break-all">UA: {a.user_agent || "—"}</div>
                          <div>
                            CAPTCHA: {a.captcha_required ? (a.captcha_passed ? "passed" : "failed/pending") : "not required"}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {active.admin_response && (
                  <div className="p-4 rounded-lg border border-border">
                    <p className="text-xs text-muted-foreground mb-1">
                      Last reply{active.responded_at ? ` · ${format(new Date(active.responded_at), "MMM d, yyyy HH:mm")}` : ""}
                    </p>
                    <p className="whitespace-pre-wrap text-sm">{active.admin_response}</p>
                  </div>
                )}

                <div>
                  <label htmlFor="support-reply" className="text-sm font-medium mb-2 block">
                    Reply to {active.name}
                  </label>
                  <Textarea
                    id="support-reply"
                    className="min-h-[140px]"
                    maxLength={5000}
                    placeholder="Write your response — it will be emailed to the sender."
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{reply.length}/5000</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Set status after sending:</span>
                    <Select value={replyStatus} onValueChange={(v) => setReplyStatus(v as typeof replyStatus)}>
                      <SelectTrigger className="w-[140px]" aria-label="Status after sending reply">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={sendReply} disabled={sending}>
                    {sending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />Sending…</>
                    ) : (
                      <><Send className="w-4 h-4 mr-2" aria-hidden="true" />Send reply</>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSupport;