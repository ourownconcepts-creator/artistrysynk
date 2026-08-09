import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { AlertTriangle, CheckCircle2, Clock, Loader2, RefreshCw, Trash2 } from "lucide-react";
import {
  getRetentionOverview,
  runRetentionSweepNow,
  type RetentionOverview,
  type RetentionRunView,
} from "@/lib/retention.functions";
import { PageSEO } from "@/components/seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const when = (iso: string) => format(new Date(iso), "d MMM yyyy HH:mm");

/** Status page for the automated retention sweeps: when, what, and with what result. */
const AdminRetention = () => {
  const load = useServerFn(getRetentionOverview);
  const sweep = useServerFn(runRetentionSweepNow);

  const [data, setData] = useState<RetentionOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [sweeping, setSweeping] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setData(await load());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load retention status.");
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runSweep = async () => {
    setSweeping(true);
    try {
      const res = await sweep({ data: {} });
      toast.success(`Sweep finished — ${res.deleted} records removed.`);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The sweep could not be started.");
    } finally {
      setSweeping(false);
    }
  };

  /** Runs from the same sweep share a timestamp to the minute. */
  const sweeps = useMemo(() => {
    const groups = new Map<string, RetentionRunView[]>();
    for (const run of data?.runs ?? []) {
      const key = `${run.createdAt.slice(0, 16)}|${run.triggeredBy}`;
      groups.set(key, [...(groups.get(key) ?? []), run]);
    }
    return [...groups.entries()].map(([key, runs]) => ({
      key,
      startedAt: runs[0]!.createdAt,
      triggeredBy: runs[0]!.triggeredBy,
      runs,
      deleted: runs.reduce((sum, r) => sum + r.deletedCount, 0),
      failures: runs.filter((r) => r.status !== "success").length,
    }));
  }, [data]);

  const latest = sweeps[0];
  const automated = (data?.policies ?? []).filter((p) => p.isAutomated);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <PageSEO
        title="Retention run status · Admin"
        description="Status of automated data retention purges."
        noIndex
      />

      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Trash2 className="h-6 w-6" /> Retention run status
          </h1>
          <p className="text-sm text-muted-foreground">
            Automated purges run daily at 03:15 UTC. Every rule and result is logged below.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button onClick={() => void runSweep()} disabled={sweeping}>
            {sweeping ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Run sweep now
          </Button>
        </div>
      </header>

      {loading && !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Last purge</CardDescription>
                <CardTitle className="text-lg">
                  {latest ? formatDistanceToNow(new Date(latest.startedAt), { addSuffix: true }) : "Never run"}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {latest ? `${when(latest.startedAt)} · ${latest.triggeredBy}` : "No sweep recorded yet."}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Rules affected in that run</CardDescription>
                <CardTitle className="text-lg">{latest ? latest.runs.length : 0}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {latest ? `${latest.deleted} records removed` : `${automated.length} automated rules armed`}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Failures in that run</CardDescription>
                <CardTitle className="text-lg">{latest ? latest.failures : 0}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {latest && latest.failures > 0 ? "Check the run detail below." : "All rules completed."}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Automated rules</CardTitle>
              <CardDescription>Each rule and when it last deleted anything.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {automated.length === 0 ? (
                <p className="text-sm text-muted-foreground">No automated rules configured.</p>
              ) : (
                automated.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 text-sm last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium">{p.category}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.retentionRule} · {p.targetTable ?? "not linked to data"}
                      </p>
                    </div>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {p.lastRunAt
                        ? `${when(p.lastRunAt)} · ${p.lastDeletedCount ?? 0} removed`
                        : "not run yet"}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Run history</h2>
            {sweeps.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sweeps recorded yet.</p>
            ) : (
              sweeps.map((s) => (
                <Card key={s.key}>
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <CardTitle className="text-base">{when(s.startedAt)}</CardTitle>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{s.triggeredBy}</Badge>
                        <Badge variant={s.failures ? "destructive" : "secondary"}>
                          {s.deleted} removed · {s.runs.length} rule{s.runs.length === 1 ? "" : "s"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {s.runs.map((r) => (
                      <div
                        key={r.id}
                        className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-0 last:pb-0"
                      >
                        <div>
                          <p className="font-medium">{r.category}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.target}
                            {r.cutoff ? ` · older than ${format(new Date(r.cutoff), "d MMM yyyy")}` : ""}
                            {r.errorMessage ? ` · ${r.errorMessage}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{r.deletedCount} removed</span>
                          {r.status === "success" ? (
                            <Badge variant="outline" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" /> ok
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" /> failed
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRetention;
