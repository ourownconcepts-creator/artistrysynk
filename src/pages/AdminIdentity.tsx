import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { BadgeCheck, FileClock, Loader2, ShieldCheck } from "lucide-react";
import { CAPABILITY_LABELS, LEVEL_LABELS } from "@/lib/capabilities";

type Summary = { status: string; level: string; total: number };
type Review = {
  id: string;
  subject_type: string;
  subject_id: string;
  username: string | null;
  capability: string | null;
  status: string;
  requested_at: string;
  verified_at: string | null;
  current_level: string;
  has_legal_details: boolean;
};
type AccessLog = {
  id: string;
  accessor_username: string | null;
  subject_username: string | null;
  reason: string | null;
  accessed_at: string;
};

/**
 * Identity console for compliance/super admins. It deliberately shows only
 * verification state and audit metadata — no legal names or dates of birth.
 */
const AdminIdentity = () => {
  const [summary, setSummary] = useState<Summary[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, v, l] = await Promise.all([
      supabase.rpc("admin_verification_summary"),
      supabase.rpc("admin_list_verifications", {
        _status: statusFilter === "all" ? undefined : statusFilter,
        _limit: 100,
      }),
      supabase.rpc("admin_list_identity_access", { _limit: 100 }),
    ]);
    if (s.error || v.error || l.error) setDenied(true);
    setSummary((s.data ?? []) as Summary[]);
    setReviews((v.data ?? []) as Review[]);
    setLogs((l.data ?? []) as AccessLog[]);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (id: string, status: "verified" | "failed", level = "identity_verified") => {
    setBusyId(id);
    const { error } = await supabase.rpc("admin_decide_verification", {
      _id: id,
      _status: status,
      _level: level,
    });
    setBusyId(null);
    if (error) toast.error("Could not update that verification.");
    else {
      toast.success(status === "verified" ? "Member verified." : "Verification rejected.");
      void load();
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden="true" />
      </div>
    );
  }

  if (denied) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Not available</CardTitle>
            <CardDescription>
              Only compliance and super admins can open the identity console.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <ShieldCheck className="h-6 w-6 text-primary" aria-hidden="true" />
          Identity &amp; verification
        </h1>
        <p className="text-sm text-muted-foreground">
          Review verification requests and audit who accessed legal identity records. Legal names and
          dates of birth are never displayed here.
        </p>
      </header>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {summary.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              No identity records yet.
            </CardContent>
          </Card>
        ) : (
          summary.map((s) => (
            <Card key={`${s.status}-${s.level}`}>
              <CardContent className="space-y-1 py-5">
                <p className="text-2xl font-bold">{s.total}</p>
                <p className="text-sm capitalize">{s.status}</p>
                <p className="text-xs text-muted-foreground">
                  {LEVEL_LABELS[s.level] ?? s.level}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue" className="gap-2">
            <BadgeCheck className="h-4 w-4" /> Review queue
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <FileClock className="h-4 w-4" /> Access log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4 pt-4">
          <div className="w-56">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="failed">Rejected</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {reviews.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nothing in this queue.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {reviews.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {r.username ? `@${r.username}` : r.subject_id.slice(0, 8)}
                      <span className="ml-2 text-xs text-muted-foreground">{r.subject_type}</span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.capability
                        ? (CAPABILITY_LABELS[r.capability] ?? r.capability)
                        : "General verification"}{" "}
                      · requested {new Date(r.requested_at).toLocaleDateString()} ·{" "}
                      {LEVEL_LABELS[r.current_level] ?? r.current_level}
                    </p>
                  </div>
                  <Badge variant={r.has_legal_details ? "secondary" : "outline"} className="text-[10px]">
                    {r.has_legal_details ? "Details on file" : "No details supplied"}
                  </Badge>
                  <Badge
                    variant={r.status === "verified" ? "default" : "secondary"}
                    className="text-[10px] capitalize"
                  >
                    {r.status}
                  </Badge>
                  {r.status === "pending" ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={busyId === r.id}
                        onClick={() => void decide(r.id, "verified")}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === r.id}
                        onClick={() => void decide(r.id, "failed")}
                      >
                        Reject
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="audit" className="pt-4">
          {logs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No staff has opened a legal identity record yet.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {logs.map((l) => (
                <li key={l.id} className="p-4 text-sm">
                  <p className="font-medium">
                    {l.accessor_username ? `@${l.accessor_username}` : "Staff"} viewed{" "}
                    {l.subject_username ? `@${l.subject_username}` : "a member"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(l.accessed_at).toLocaleString()} · {l.reason ?? "no reason given"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminIdentity;