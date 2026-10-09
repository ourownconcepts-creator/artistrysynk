import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { canEditAssignment, canFinalize, isValidScore, weightedScore, type Criterion, type CriterionScore } from "@/features/competitions/judging";
import { finalizeAssignment, getMyJudging, saveScores, type JudgeAssignment, type MyJudging } from "@/features/competitions/judging.service";
import { sanitizeExternalUrl } from "@/lib/safeLinks";

export const Route = createFileRoute("/creative-talent-hunt_/legacy-judge")({
  head: () => ({
    meta: [
      { title: "Judge Workspace — Creative Talent Hunt" },
      { name: "description", content: "Score your assigned Creative Talent Hunt contestants." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: JudgePage,
});

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

function JudgePage() {
  const navigate = useNavigate();
  const [data, setData] = useState<MyJudging | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => setData(await getMyJudging()), []);

  useEffect(() => {
    void (async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) {
        await navigate({ to: "/auth" });
        return;
      }
      try { await load(); } catch (e) { toast.error(errMsg(e)); } finally { setLoading(false); }
    })();
  }, [load, navigate]);

  return (
    <PageTransition>
      <main className="min-h-screen bg-background text-foreground">
        <section className="border-b">
          <div className="mx-auto max-w-5xl px-6 py-8">
            <Link to="/creative-talent-hunt" className="text-sm text-muted-foreground hover:text-foreground">← Creative Talent Hunt</Link>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">Judge Workspace</h1>
            <p className="mt-2 text-muted-foreground">Score each criterion from 0 to 10. Each counts for 20% of a score out of 100.</p>
          </div>
        </section>
        <section className="mx-auto max-w-5xl space-y-6 px-6 py-10">
          {loading ? (
            <div className="rounded-3xl border p-8 text-muted-foreground">Loading your assignments…</div>
          ) : !data?.is_judge ? (
            <div className="rounded-3xl border p-8">
              <h2 className="text-xl font-bold">You're not a judge for this competition</h2>
              <p className="mt-2 text-muted-foreground">If you've been invited to judge, ask a competition administrator to activate your account.</p>
            </div>
          ) : data.assignments.length === 0 ? (
            <div className="rounded-3xl border p-8 text-muted-foreground">No contestants assigned to you yet.</div>
          ) : (
            data.assignments.map((a) => <AssignmentCard key={a.id} assignment={a} criteria={data.criteria} onChanged={load} />)
          )}
        </section>
      </main>
    </PageTransition>
  );
}

function AssignmentCard({ assignment, criteria, onChanged }: { assignment: JudgeAssignment; criteria: Criterion[]; onChanged: () => Promise<void> }) {
  const editable = canEditAssignment(assignment.status);
  const [values, setValues] = useState<Record<string, string>>(
    () => Object.fromEntries(assignment.scores.map((s) => [s.criterion_id, String(s.score)])),
  );
  const [comment, setComment] = useState(assignment.comment);
  const [busy, setBusy] = useState(false);

  const scores: CriterionScore[] = criteria
    .filter((c) => values[c.id] !== undefined && values[c.id] !== "")
    .map((c) => ({ criterion_id: c.id, score: Number(values[c.id]) }));
  const invalid = criteria.find((c) => values[c.id] && !isValidScore(Number(values[c.id]), c.max_score));
  let preview: number | null = null;
  try { preview = invalid ? null : weightedScore(criteria, scores); } catch { preview = null; }
  const url = sanitizeExternalUrl(assignment.audition_url);

  const save = async () => {
    if (invalid) { toast.error(`${invalid.name} must be between 0 and ${invalid.max_score}.`); return false; }
    setBusy(true);
    try { await saveScores(assignment.id, scores, comment); toast.success("Draft saved."); return true; }
    catch (e) { toast.error(errMsg(e)); return false; }
    finally { setBusy(false); }
  };

  const finalize = async () => {
    if (!(await save())) return;
    setBusy(true);
    try { await finalizeAssignment(assignment.id); toast.success("Scores finalized."); await onChanged(); }
    catch (e) { toast.error(errMsg(e)); }
    finally { setBusy(false); }
  };

  return (
    <article className="rounded-3xl border p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">{assignment.status}</span>
          <h2 className="mt-3 text-2xl font-bold">{assignment.display_name} <span className="font-normal text-muted-foreground">@{assignment.handle}</span></h2>
          <p className="text-sm text-muted-foreground">{assignment.category_name}{assignment.location && ` · ${assignment.location}`}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Score</p>
          <p className="text-3xl font-bold">{preview ?? "—"}<span className="text-base font-normal text-muted-foreground">/100</span></p>
        </div>
      </div>
      {assignment.bio && <p className="mt-4 whitespace-pre-wrap text-sm leading-7">{assignment.bio}</p>}
      {assignment.experience && <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{assignment.experience}</p>}
      {url && <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline">Open submission →</a>}
      {assignment.audition_notes && <p className="mt-3 rounded-2xl bg-muted/40 p-3 text-sm">{assignment.audition_notes}</p>}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {criteria.map((c) => (
          <label key={c.id} className="block">
            <span className="text-sm font-semibold">{c.name}</span>
            {c.description && <span className="block text-xs text-muted-foreground">{c.description}</span>}
            <Input type="number" min={0} max={c.max_score} step={0.5} disabled={!editable || busy}
              value={values[c.id] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [c.id]: e.target.value }))}
              className="mt-1" aria-label={`${c.name} score`} />
          </label>
        ))}
      </div>
      <label className="mt-4 block">
        <span className="text-sm font-semibold">Comment (private to admins)</span>
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} disabled={!editable || busy} className="mt-1" maxLength={4000} />
      </label>

      {editable ? (
        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => void save().then((ok) => { if (ok) void onChanged(); })} disabled={busy}>Save draft</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={busy || !canFinalize(assignment.status, criteria, scores) || !!invalid}>Finalize scores</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Finalize scores for {assignment.display_name}?</AlertDialogTitle>
                <AlertDialogDescription>Final score: {preview ?? "—"}/100. You won't be able to change these scores afterwards.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => void finalize()}>Finalize</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ) : (
        <p className="mt-5 text-sm text-muted-foreground">Finalized — these scores are locked.</p>
      )}
    </article>
  );
}
