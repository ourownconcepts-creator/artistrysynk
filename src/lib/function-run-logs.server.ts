import type { SupabaseClient } from "@supabase/supabase-js";

export interface FunctionRunLogRow {
  id: string;
  function_name: string;
  status: string;
  duration_ms: number | null;
  error_message: string | null;
  context: unknown;
  created_at: string;
}

export interface FunctionRunSummary {
  functionName: string;
  total: number;
  errors: number;
  avgDurationMs: number | null;
  lastRunAt: string | null;
  lastStatus: string | null;
}

export async function listFunctionRuns(
  supabase: SupabaseClient<any, any, any>,
  input: { functionName?: string | null; status?: string | null; hours: number; limit: number },
) {
  const since = new Date(Date.now() - input.hours * 3_600_000).toISOString();

  let query = supabase
    .from("function_run_logs")
    .select("id, function_name, status, duration_ms, error_message, context, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(input.limit);

  if (input.functionName) query = query.eq("function_name", input.functionName);
  if (input.status) query = query.eq("status", input.status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const runs = (data ?? []) as FunctionRunLogRow[];

  // Summary is computed over the same window, ignoring the row filters,
  // so the health cards stay stable while browsing.
  const { data: allData, error: allError } = await supabase
    .from("function_run_logs")
    .select("function_name, status, duration_ms, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(2000);
  if (allError) throw new Error(allError.message);

  const grouped = new Map<string, FunctionRunSummary & { _durations: number[] }>();
  for (const row of (allData ?? []) as Array<Pick<FunctionRunLogRow, "function_name" | "status" | "duration_ms" | "created_at">>) {
    let entry = grouped.get(row.function_name);
    if (!entry) {
      entry = {
        functionName: row.function_name,
        total: 0,
        errors: 0,
        avgDurationMs: null,
        lastRunAt: row.created_at,
        lastStatus: row.status,
        _durations: [],
      };
      grouped.set(row.function_name, entry);
    }
    entry.total += 1;
    if (row.status === "error") entry.errors += 1;
    if (typeof row.duration_ms === "number") entry._durations.push(row.duration_ms);
  }

  const summaries: FunctionRunSummary[] = [...grouped.values()]
    .map(({ _durations, ...rest }) => ({
      ...rest,
      avgDurationMs: _durations.length
        ? Math.round(_durations.reduce((a, b) => a + b, 0) / _durations.length)
        : null,
    }))
    .sort((a, b) => b.errors - a.errors || b.total - a.total);

  return { runs, summaries };
}
