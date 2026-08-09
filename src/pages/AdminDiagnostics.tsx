import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@/lib/router-compat";
import { listDiagnosticEvents } from "@/lib/diagnostics.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageSEO } from "@/components/seo";
import { format } from "date-fns";
import { ArrowLeft, PlugZap, RefreshCw, Search, ServerCrash, Link2 } from "lucide-react";

type Row = {
  id: string;
  function_name: string;
  error_message: string | null;
  created_at: string;
  context: Record<string, string | number | boolean | null>;
};

type Group = {
  correlationId: string;
  events: number;
  firstAt: string;
  lastAt: string;
  routes: string[];
  kinds: string[];
};

const RANGES = [
  { label: "Last 6 hours", value: "6" },
  { label: "Last 24 hours", value: "24" },
  { label: "Last 7 days", value: "168" },
];

const KINDS = [
  { label: "All events", value: "all" },
  { label: "Client disconnects", value: "client-disconnect" },
  { label: "Server 5xx", value: "server-5xx" },
  { label: "Client runtime errors", value: "client-runtime-error" },
];

const kindLabel = (name: string) =>
  name === "client-disconnect" ? "Disconnect" : name === "server-5xx" ? "Server 5xx" : "Runtime error";

export default function AdminDiagnostics() {
  const navigate = useNavigate();
  const fetchEvents = useServerFn(listDiagnosticEvents);
  const [hours, setHours] = useState("24");
  const [kind, setKind] = useState("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["admin-diagnostics", hours, kind],
    queryFn: () => fetchEvents({ data: { hours: Number(hours), kind: kind as never, limit: 250 } }),
  });

  const rows = (data?.rows ?? []) as Row[];
  const counts = (data?.counts ?? {}) as Record<string, number>;
  const correlated = (data?.correlated ?? []) as Group[];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (r) =>
        (r.error_message ?? "").toLowerCase().includes(term) ||
        JSON.stringify(r.context ?? {}).toLowerCase().includes(term),
    );
  }, [rows, search]);

  return (
    <div className="container mx-auto max-w-6xl space-y-6 px-4 py-8">
      <PageSEO
        title="Error diagnostics | ArtistrySynk Admin"
        description="Client disconnect and abort events with timestamps, routes and correlation IDs."
        noIndex
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="mb-2 -ml-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to admin
          </Button>
          <h1 className="text-2xl font-bold">Error diagnostics</h1>
          <p className="text-sm text-muted-foreground">
            Client disconnects/aborts, server 5xx responses and runtime errors — joined by correlation ID.
          </p>
        </div>
        <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <PlugZap className="h-4 w-4" /> Disconnects / aborts
            </CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{counts["client-disconnect"] ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <ServerCrash className="h-4 w-4" /> Server 5xx
            </CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{counts["server-5xx"] ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Link2 className="h-4 w-4" /> Correlated incidents
            </CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{correlated.length}</CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={hours} onValueChange={setHours}>
          <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="w-[210px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {KINDS.map((k) => (
              <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search route, reason or correlation ID"
            className="pl-9"
          />
        </div>
      </div>

      {correlated.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Correlated incidents</CardTitle>
            <CardDescription>Server failures linked to the client abort that followed them.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {correlated.map((group) => (
              <button
                key={group.correlationId}
                onClick={() => setSearch(group.correlationId)}
                className="flex w-full flex-wrap items-center gap-2 rounded-md border p-3 text-left text-sm hover:bg-muted/50"
              >
                <code className="font-mono text-xs">{group.correlationId}</code>
                <span className="text-muted-foreground">{group.routes.join(", ")}</span>
                {group.kinds.map((k) => (
                  <Badge key={k} variant="outline">{kindLabel(k)}</Badge>
                ))}
                <span className="ml-auto text-xs text-muted-foreground">
                  {format(new Date(group.lastAt), "dd MMM HH:mm:ss")} · {group.events} events
                </span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Event log</CardTitle>
          <CardDescription>{filtered.length} events in the selected window.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {error ? (
            <p className="text-sm text-destructive">Could not load diagnostics.</p>
          ) : isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No disconnects or errors recorded — good news.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Correlation ID</TableHead>
                  <TableHead>Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {format(new Date(row.created_at), "dd MMM HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.function_name === "server-5xx" ? "destructive" : "secondary"}>
                        {kindLabel(row.function_name)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate text-xs">
                      {String(row.context?.["route"] ?? "unknown")}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {String(row.context?.["correlation_id"] ?? "—")}
                    </TableCell>
                    <TableCell className="max-w-[320px] truncate text-xs text-muted-foreground">
                      {row.error_message ?? "—"}
                      {row.context?.["phase"] ? ` · ${String(row.context["phase"])}` : ""}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
