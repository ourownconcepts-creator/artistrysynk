import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@/lib/router-compat";
import { listFunctionRuns as listFunctionRunsFn } from "@/lib/function-run-logs.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageSEO } from "@/components/seo";
import { format } from "date-fns";
import { ArrowLeft, Activity, AlertTriangle, CheckCircle2, RefreshCw, Timer, Search } from "lucide-react";

type RunRow = {
  id: string;
  function_name: string;
  status: string;
  duration_ms: number | null;
  error_message: string | null;
  context: unknown;
  created_at: string;
};

const RANGE_OPTIONS = [
  { label: "Last 24 hours", value: "24" },
  { label: "Last 7 days", value: "168" },
  { label: "Last 30 days", value: "720" },
];

export default function AdminFunctionLogs() {
  const navigate = useNavigate();
  const fetchRuns = useServerFn(listFunctionRunsFn);

  const [hours, setHours] = useState("168");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "error">("all");
  const [functionFilter, setFunctionFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["function-run-logs", hours, statusFilter, functionFilter],
    queryFn: () =>
      fetchRuns({
        data: {
          hours: Number(hours),
          limit: 200,
          status: statusFilter === "all" ? null : statusFilter,
          functionName: functionFilter === "all" ? null : functionFilter,
        },
      }),
  });

  const summaries = data?.summaries ?? [];
  const runs = (data?.runs ?? []) as RunRow[];

  const filteredRuns = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return runs;
    return runs.filter(
      (r) =>
        r.function_name.toLowerCase().includes(term) ||
        (r.error_message ?? "").toLowerCase().includes(term) ||
        JSON.stringify(r.context ?? {}).toLowerCase().includes(term),
    );
  }, [runs, search]);

  const totals = useMemo(() => {
    const total = summaries.reduce((sum, s) => sum + s.total, 0);
    const errors = summaries.reduce((sum, s) => sum + s.errors, 0);
    const durations = summaries.filter((s) => s.avgDurationMs != null);
    const avg = durations.length
      ? Math.round(durations.reduce((sum, s) => sum + (s.avgDurationMs ?? 0), 0) / durations.length)
      : null;
    return { total, errors, avg, successRate: total ? Math.round(((total - errors) / total) * 100) : null };
  }, [summaries]);

  const recentErrors = runs.filter((r) => r.status === "error").slice(0, 8);

  return (
    <div className="min-h-screen bg-background">
      <PageSEO
        title="Function Run History | ArtistrySynk Admin"
        description="Admin view of support and notification background job runs, statuses and recent errors."
        noIndex
      />

      <div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} aria-label="Back to admin dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Activity className="h-6 w-6 text-primary" /> Function Run History
              </h1>
              <p className="text-sm text-muted-foreground">
                Support &amp; notification background jobs — runs, statuses and recent errors.
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total runs</CardDescription>
              <CardTitle className="text-3xl">{totals.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Success rate
              </CardDescription>
              <CardTitle className="text-3xl">{totals.successRate == null ? "—" : `${totals.successRate}%`}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" /> Errors
              </CardDescription>
              <CardTitle className="text-3xl">{totals.errors}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Timer className="h-3.5 w-3.5" /> Avg duration
              </CardDescription>
              <CardTitle className="text-3xl">{totals.avg == null ? "—" : `${totals.avg}ms`}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Per-function health</CardTitle>
            <CardDescription>Grouped over the selected time range.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {summaries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                {isLoading ? "Loading run history…" : "No runs recorded in this range yet."}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Function</TableHead>
                    <TableHead>Runs</TableHead>
                    <TableHead>Errors</TableHead>
                    <TableHead>Avg duration</TableHead>
                    <TableHead>Last run</TableHead>
                    <TableHead>Last status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaries.map((s) => (
                    <TableRow key={s.functionName}>
                      <TableCell className="font-medium">{s.functionName}</TableCell>
                      <TableCell>{s.total}</TableCell>
                      <TableCell>
                        {s.errors > 0 ? <Badge variant="destructive">{s.errors}</Badge> : <span>0</span>}
                      </TableCell>
                      <TableCell>{s.avgDurationMs == null ? "—" : `${s.avgDurationMs}ms`}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {s.lastRunAt ? format(new Date(s.lastRunAt), "MMM d, HH:mm") : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.lastStatus === "error" ? "destructive" : "secondary"}>
                          {s.lastStatus ?? "—"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {recentErrors.length > 0 && (
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" /> Recent errors
              </CardTitle>
              <CardDescription>Latest failures across support and notification jobs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentErrors.map((r) => (
                <div key={r.id} className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{r.function_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(r.created_at), "MMM d, yyyy HH:mm:ss")}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-destructive break-words">{r.error_message ?? "Unknown error"}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="space-y-4">
            <div>
              <CardTitle className="text-lg">Run log</CardTitle>
              <CardDescription>Most recent runs first (up to 200).</CardDescription>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search function or error"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search run log"
                />
              </div>
              <Select value={functionFilter} onValueChange={setFunctionFilter}>
                <SelectTrigger aria-label="Filter by function">
                  <SelectValue placeholder="All functions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All functions</SelectItem>
                  {summaries.map((s) => (
                    <SelectItem key={s.functionName} value={s.functionName}>
                      {s.functionName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger aria-label="Filter by status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
              <Select value={hours} onValueChange={setHours}>
                <SelectTrigger aria-label="Filter by time range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RANGE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {error ? (
              <p className="text-sm text-destructive py-6 text-center">
                Couldn't load run history. Please refresh and try again.
              </p>
            ) : filteredRuns.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                {isLoading ? "Loading run history…" : "No runs match these filters."}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Function</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRuns.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(r.created_at), "MMM d, HH:mm:ss")}
                      </TableCell>
                      <TableCell className="font-medium">{r.function_name}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "error" ? "destructive" : "secondary"}>{r.status}</Badge>
                      </TableCell>
                      <TableCell>{r.duration_ms == null ? "—" : `${r.duration_ms}ms`}</TableCell>
                      <TableCell className="max-w-md text-sm text-muted-foreground break-words">
                        {r.error_message ?? JSON.stringify(r.context ?? {})}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
