import type { SupabaseClient } from "@supabase/supabase-js";

export const DIAGNOSTIC_FUNCTIONS = ["client-disconnect", "server-5xx", "client-runtime-error"] as const;

export type DiagnosticRow = {
  id: string;
  function_name: string;
  error_message: string | null;
  created_at: string;
  context: Record<string, string | number | boolean | null>;
};

export type DiagnosticGroup = {
  correlationId: string;
  events: number;
  firstAt: string;
  lastAt: string;
  routes: string[];
  kinds: string[];
};

export async function listDiagnostics(
  supabase: SupabaseClient<any, any, any>,
  input: { hours: number; limit: number; kind: string },
) {
  const since = new Date(Date.now() - input.hours * 3_600_000).toISOString();
  const names = input.kind === "all" ? [...DIAGNOSTIC_FUNCTIONS] : [input.kind];

  const { data, error } = await supabase
    .from("function_run_logs")
    .select("id, function_name, error_message, created_at, context")
    .in("function_name", names)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(input.limit);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as DiagnosticRow[];

  // Group by correlation id so a server 5xx and the client abort that followed
  // it show up as one incident.
  const groups = new Map<string, DiagnosticGroup>();
  for (const row of rows) {
    const cid = String(row.context?.["correlation_id"] ?? "").trim();
    if (!cid) continue;
    const route = String(row.context?.["route"] ?? "") || "unknown";
    let group = groups.get(cid);
    if (!group) {
      group = {
        correlationId: cid,
        events: 0,
        firstAt: row.created_at,
        lastAt: row.created_at,
        routes: [],
        kinds: [],
      };
      groups.set(cid, group);
    }
    group.events += 1;
    group.firstAt = row.created_at < group.firstAt ? row.created_at : group.firstAt;
    group.lastAt = row.created_at > group.lastAt ? row.created_at : group.lastAt;
    if (!group.routes.includes(route)) group.routes.push(route);
    if (!group.kinds.includes(row.function_name)) group.kinds.push(row.function_name);
  }

  const counts = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.function_name] = (acc[row.function_name] ?? 0) + 1;
    return acc;
  }, {});

  return {
    rows,
    counts,
    correlated: [...groups.values()]
      .filter((g) => g.events > 1 || g.kinds.length > 1)
      .sort((a, b) => b.lastAt.localeCompare(a.lastAt))
      .slice(0, 50),
  };
}
