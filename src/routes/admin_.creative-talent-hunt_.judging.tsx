import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  assignJudge, getAdminResults, getJudgingOverview, isCompetitionAdmin, setJudgeActive,
  setLeaderboardPublished, unassignJudge, upsertJudge, type AdminResult, type JudgingOverview,
} from "@/features/competitions/judging.service";

export const Route = createFileRoute("/admin_/creative-talent-hunt_/judging")({
  head: () => ({
    meta: [
      { title: "Talent Hunt Judging — ArtistrySynk Admin" },
      { name: "description", content: "Manage Creative Talent Hunt judges, assignments and scoring progress." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: JudgingAdminPage,
});

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

function JudgingAdminPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [overview, setOverview] = useState<JudgingOverview | null>(null);
  const [results, setResults] = useState<AdminResult[]>([]);
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [o, r] = await Promise.all([getJudgingOverview(), getAdminResults()]);
    setOverview(o);
    setResults(r);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) return;
        const ok = await isCompetitionAdmin();
        setAllowed(ok);
        if (ok) await load();
      } catch (e) {
        toast.error(errMsg(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const run = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await fn();
      await load();
      toast.success(success);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const activeJudges = overview?.judges.filter((j) => j.is_active) ?? [];

  return (
    <PageTransition>
      <main className="min-h-screen bg-background text-foreground">
        <section className="border-b">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Competition Operations</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">Talent Hunt Judging</h1>
            </div>
            <div className="flex gap-4 text-sm">
              <Link to="/admin/creative-talent-hunt" className="text-muted-foreground hover:text-foreground">Review queue →</Link>
              <Link to="/creative-talent-hunt/leaderboard" className="text-muted-foreground hover:text-foreground">Public leaderboard →</Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl space-y-10 px-6 py-10">
          {loading ? (
            <div className="rounded-3xl border p-8 text-muted-foreground">Loading judging workspace…</div>
          ) : !allowed || !overview ? (
            <div className="rounded-3xl border p-8">
              <h2 className="text-xl font-bold">Access restricted</h2>
              <p className="mt-2 text-muted-foreground">Only ArtistrySynk competition administrators can manage judging.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5">
                <div>
                  <h2 className="font-bold">Public leaderboard</h2>
                  <p className="text-sm text-muted-foreground">
                    When on, approved public contestants with finalized scores appear ranked. Judge names and comments are never shown.
                  </p>
                </div>
                <Switch
                  checked={overview.leaderboard_published}
                  disabled={busy}
                  onCheckedChange={(v) => void run(() => setLeaderboardPublished(v), v ? "Leaderboard published." : "Leaderboard hidden.")}
                  aria-label="Publish leaderboard"
                />
              </div>

              <div className="rounded-3xl border p-6">
                <h2 className="text-xl font-bold">Judges</h2>
                <form
                  className="mt-4 flex flex-wrap gap-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!username.trim()) return;
                    void run(async () => { await upsertJudge(username); setUsername(""); }, "Judge added.");
                  }}
                >
                  <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Member username, e.g. @jane" className="max-w-xs" />
                  <Button type="submit" disabled={busy}>Add judge</Button>
                </form>
                <div className="mt-6 divide-y">
                  {overview.judges.length === 0 && <p className="text-sm text-muted-foreground">No judges yet.</p>}
                  {overview.judges.map((j) => (
                    <div key={j.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div>
                        <p className="font-semibold">{j.display_name} {j.username && <span className="font-normal text-muted-foreground">@{j.username}</span>}</p>
                        <p className="text-sm text-muted-foreground">{j.finalized} of {j.assigned} scored</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span>{j.is_active ? "Active" : "Inactive"}</span>
                        <Switch checked={j.is_active} disabled={busy} aria-label={`Toggle ${j.display_name}`}
                          onCheckedChange={(v) => void run(() => setJudgeActive(j.id, v), v ? "Judge activated." : "Judge deactivated.")} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border p-6">
                <h2 className="text-xl font-bold">Assignments</h2>
                <p className="mt-1 text-sm text-muted-foreground">Approved contestants only. Finalized scores can't be unassigned.</p>
                <div className="mt-6 space-y-4">
                  {overview.contestants.length === 0 && <p className="text-sm text-muted-foreground">No approved contestants yet.</p>}
                  {overview.contestants.map((c) => {
                    const assignedIds = new Set(c.assignments.map((a) => a.judge_id));
                    return (
                      <div key={c.id} className="rounded-2xl bg-muted/40 p-4">
                        <p className="font-semibold">{c.display_name} <span className="font-normal text-muted-foreground">@{c.handle} · {c.category_name}</span></p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {c.assignments.map((a) => {
                            const judge = overview.judges.find((j) => j.id === a.judge_id);
                            return (
                              <span key={a.id} className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs">
                                {judge?.display_name ?? "Judge"} · {a.status}
                                {a.status !== "FINALIZED" && (
                                  <button type="button" className="text-destructive" disabled={busy} aria-label="Unassign"
                                    onClick={() => void run(() => unassignJudge(a.id), "Judge unassigned.")}>×</button>
                                )}
                              </span>
                            );
                          })}
                          <select
                            className="rounded-full border bg-background px-3 py-1 text-xs"
                            value=""
                            disabled={busy}
                            onChange={(e) => e.target.value && void run(() => assignJudge(e.target.value, c.id), "Judge assigned.")}
                            aria-label={`Assign judge to ${c.display_name}`}
                          >
                            <option value="">+ Assign judge</option>
                            {activeJudges.filter((j) => !assignedIds.has(j.id)).map((j) => (
                              <option key={j.id} value={j.id}>{j.display_name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-3xl border p-6">
                <h2 className="text-xl font-bold">Results (admin only)</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-muted-foreground">
                      <tr><th className="py-2">Rank</th><th>Contestant</th><th>Category</th><th>Score /100</th><th>Progress</th><th>Judges</th></tr>
                    </thead>
                    <tbody className="divide-y">
                      {results.map((r) => (
                        <tr key={r.application_id}>
                          <td className="py-2 font-bold">{r.rank ?? "—"}</td>
                          <td>{r.display_name} <span className="text-muted-foreground">@{r.handle}</span></td>
                          <td>{r.category_name}</td>
                          <td>{r.judge_score ?? "—"}</td>
                          <td>{r.finalized_count}/{r.assigned_count}</td>
                          <td className="text-xs text-muted-foreground">
                            {r.breakdown.map((b) => `${b.judge}: ${b.score ?? "—"} (${b.status})`).join(" · ") || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </PageTransition>
  );
}
