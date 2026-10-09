import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { getTalentHuntAdminSnapshot, setTalentHuntRoundStatus, setTalentHuntStatus, getTalentHuntVotingSummary, getTalentHuntVoteTotals, getTalentHuntSuspiciousVotes, voidTalentHuntVotes, setTalentHuntVotingWindow, closeTalentHuntVoting } from "@/features/competitions/creativeTalentHunt.admin";
import { listCreativeTalentHuntJudges, setCreativeTalentHuntJudgeActive, appointCreativeTalentHuntJudge, assignCreativeTalentHuntJudge, listCreativeTalentHuntAdminAccounts } from "@/features/competitions/creativeTalentHunt.operations";
import { getCreativeTalentHuntRoundProgress, listCreativeTalentHuntScoreCorrections, decideCreativeTalentHuntRound, listCreativeTalentHuntScoreDetails, correctCreativeTalentHuntScore } from "@/features/competitions/creativeTalentHunt.results";
import { listTalentHuntAdminApplications } from "@/features/competitions/creativeTalentHunt.service";
import { useSession } from "@/hooks/useSession";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/creative-talent-hunt/operations")({
  staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "Talent Hunt Operations — ArtistrySynk" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: OperationsPage,
});

function OperationsPage() {
  const { user, ready } = useSession();
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [judgeUserId, setJudgeUserId] = useState("");
  const [judgeName, setJudgeName] = useState("");
  const [judgeBio, setJudgeBio] = useState("");
  const [assignJudgeId, setAssignJudgeId] = useState("");
  const [assignApplicationId, setAssignApplicationId] = useState("");
  const [assignRoundId, setAssignRoundId] = useState("");
  const [decisionApplicationId, setDecisionApplicationId] = useState("");
  const [decisionOutcome, setDecisionOutcome] = useState<"ADVANCED" | "ELIMINATED" | "HELD">("ADVANCED");
  const [decisionReason, setDecisionReason] = useState("");
  const [correctionScoreId, setCorrectionScoreId] = useState("");
  const [correctedScore, setCorrectedScore] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const client = useQueryClient();
  const snapshot = useQuery({ queryKey: ["talent-hunt-admin-snapshot"], queryFn: getTalentHuntAdminSnapshot, enabled: Boolean(user) });
  useEffect(() => {
    const competition = snapshot.data?.competition;
    if (!competition) return;
    setOpensAt(competition.voting_opens_at ? new Date(competition.voting_opens_at).toISOString().slice(0, 16) : "");
    setClosesAt(competition.voting_closes_at ? new Date(competition.voting_closes_at).toISOString().slice(0, 16) : "");
  }, [snapshot.data?.competition?.voting_opens_at, snapshot.data?.competition?.voting_closes_at]);

  const statusMutation = useMutation({
    mutationFn: (status: string) => setTalentHuntStatus(status),
    onSuccess: () => { toast.success("Competition status updated."); void client.invalidateQueries({ queryKey: ["talent-hunt-admin-snapshot"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update status."),
  });

  const activeRound = snapshot.data?.rounds.find((round) => round.status !== "CLOSED") ?? snapshot.data?.rounds.at(-1);
  const judges = useQuery({ queryKey: ["talent-hunt-judges"], queryFn: listCreativeTalentHuntJudges, enabled: Boolean(user) });
  const adminAccounts = useQuery({ queryKey: ["talent-hunt-admin-accounts"], queryFn: listCreativeTalentHuntAdminAccounts, enabled: Boolean(user) });
  const applications = useQuery({ queryKey: ["talent-hunt-admin-applications"], queryFn: () => listTalentHuntAdminApplications(), enabled: Boolean(user) });
  const scoreCorrections = useQuery({ queryKey: ["talent-hunt-score-corrections"], queryFn: listCreativeTalentHuntScoreCorrections, enabled: Boolean(user) });
  const scoreDetails = useQuery({
    queryKey: ["talent-hunt-score-details", activeRound?.id],
    queryFn: () => listCreativeTalentHuntScoreDetails(activeRound!.id),
    enabled: Boolean(user && activeRound?.id),
  });
  const correctionMutation = useMutation({
    mutationFn: () => {
      const item = scoreDetails.data?.find((score) => score.score_id === correctionScoreId);
      const value = Number(correctedScore);
      if (!item) throw new Error("Choose a score to correct.");
      if (!Number.isFinite(value) || value < 0 || value > item.max_score) throw new Error(`Score must be between 0 and ${item.max_score}.`);
      if (!correctionReason.trim()) throw new Error("A correction reason is required.");
      return correctCreativeTalentHuntScore(item.score_id, value, correctionReason.trim());
    },
    onSuccess: () => {
      toast.success("Score correction recorded.");
      setCorrectionReason(""); setCorrectedScore("");
      void client.invalidateQueries({ queryKey: ["talent-hunt-score-details", activeRound?.id] });
      void client.invalidateQueries({ queryKey: ["talent-hunt-score-corrections"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not correct score."),
  });
  useEffect(() => {
    if (!assignRoundId && snapshot.data?.rounds.length) setAssignRoundId(snapshot.data.rounds[0].id);
  }, [assignRoundId, snapshot.data?.rounds]);
  useEffect(() => {
    if (!assignJudgeId && judges.data?.length) setAssignJudgeId(judges.data[0].id);
  }, [assignJudgeId, judges.data]);
  useEffect(() => {
    if (!assignApplicationId && applications.data?.length) setAssignApplicationId(String((applications.data[0] as {id:string}).id));
    if (!decisionApplicationId && applications.data?.length) setDecisionApplicationId(String((applications.data[0] as {id:string}).id));
  }, [assignApplicationId, decisionApplicationId, applications.data]);
  const appointMutation = useMutation({
    mutationFn: () => {
      if (!judgeUserId || !judgeName.trim()) throw new Error("Select an account and enter a judge display name.");
      return appointCreativeTalentHuntJudge(judgeUserId, judgeName.trim(), judgeBio.trim());
    },
    onSuccess: () => {
      toast.success("Judge appointed.");
      setJudgeUserId(""); setJudgeName(""); setJudgeBio("");
      void client.invalidateQueries({ queryKey: ["talent-hunt-judges"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not appoint judge."),
  });
  const assignMutation = useMutation({
    mutationFn: () => {
      if (!assignJudgeId || !assignApplicationId || !assignRoundId) throw new Error("Choose a judge, contestant and round.");
      return assignCreativeTalentHuntJudge(assignJudgeId, assignApplicationId, assignRoundId);
    },
    onSuccess: () => { toast.success("Judge assignment created."); void client.invalidateQueries({ queryKey: ["talent-hunt-judges"] }); void client.invalidateQueries({ queryKey: ["creative-talent-hunt-judge-queue"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not assign judge."),
  });
  const decisionMutation = useMutation({
    mutationFn: () => {
      if (!decisionApplicationId) throw new Error("Choose a contestant.");
      if ((decisionOutcome === "ELIMINATED" || decisionOutcome === "HELD") && !decisionReason.trim()) throw new Error("Add a reason for this decision.");
      return decideCreativeTalentHuntRound(decisionApplicationId, decisionOutcome, decisionReason.trim());
    },
    onSuccess: () => { toast.success("Round decision recorded."); setDecisionReason(""); void client.invalidateQueries({ queryKey: ["talent-hunt-admin-applications"] }); void client.invalidateQueries({ queryKey: ["talent-hunt-admin-snapshot"] }); void client.invalidateQueries({ queryKey: ["talent-hunt-round-progress"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not record decision."),
  });
  const roundProgress = useQuery({ queryKey: ["talent-hunt-round-progress", activeRound?.id], queryFn: () => getCreativeTalentHuntRoundProgress(activeRound!.id), enabled: Boolean(activeRound?.id) });
  const judgeActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setCreativeTalentHuntJudgeActive(id, active),
    onSuccess: () => { toast.success("Judge status updated."); void client.invalidateQueries({ queryKey: ["talent-hunt-judges"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update judge."),
  });
  const votes = useQuery({ queryKey: ["talent-hunt-votes", activeRound?.id], queryFn: () => getTalentHuntVoteTotals(activeRound!.id), enabled: Boolean(activeRound?.id) });
  const suspicious = useQuery({ queryKey: ["talent-hunt-suspicious", activeRound?.id], queryFn: () => getTalentHuntSuspiciousVotes(activeRound!.id), enabled: Boolean(activeRound?.id) });

  const votingMutation = useMutation({
    mutationFn: () => closeTalentHuntVoting(),
    onSuccess: () => { toast.success("Voting closed."); void client.invalidateQueries({ queryKey: ["talent-hunt-admin-snapshot"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not close voting."),
  });

  const windowMutation = useMutation({
    mutationFn: (value: { opensAt: string | null; closesAt: string | null }) => setTalentHuntVotingWindow(value.opensAt, value.closesAt),
    onSuccess: () => { toast.success("Voting window saved."); void client.invalidateQueries({ queryKey: ["talent-hunt-admin-snapshot"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save voting window."),
  });

  const voidMutation = useMutation({
    mutationFn: (applicationId: string) => {
      const reason = window.prompt("Reason for voiding this contestant's votes:");
      if (!reason?.trim()) throw new Error("A reason is required.");
      return voidTalentHuntVotes(reason.trim(), { applicationId });
    },
    onSuccess: () => { toast.success("Votes voided."); void client.invalidateQueries({ queryKey: ["talent-hunt-votes", activeRound?.id] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not void votes."),
  });

  const roundMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => setTalentHuntRoundStatus(id, status),
    onSuccess: () => { toast.success("Round status updated."); void client.invalidateQueries({ queryKey: ["talent-hunt-admin-snapshot"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update round."),
  });

  if (!ready) return <main className="mx-auto max-w-5xl px-6 py-20 text-muted-foreground">Loading…</main>;
  if (!user) return <main className="mx-auto max-w-5xl px-6 py-20"><h1 className="text-3xl font-bold">Sign in required</h1><Button asChild className="mt-5"><Link to="/auth">Sign in</Link></Button></main>;
  if (snapshot.isLoading) return <main className="mx-auto max-w-5xl px-6 py-20 text-muted-foreground">Loading operations…</main>;
  if (snapshot.error) return <main className="mx-auto max-w-5xl px-6 py-20"><h1 className="text-3xl font-bold">Operations unavailable</h1><p className="mt-3 text-muted-foreground">{snapshot.error instanceof Error ? snapshot.error.message : "Access restricted."}</p></main>;

  const data = snapshot.data!;
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Competition Operations</p>
        <h1 className="mt-2 text-4xl font-bold">Creative Talent Hunt control room</h1>
        <p className="mt-3 text-muted-foreground">Lifecycle, round state and voting visibility for ArtistrySynk administrators.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Applications", data.applications],
          ["Pending review", data.pending_review],
          ["Approved", data.approved],
          ["Public entries", data.public_entries],
          ["Votes", data.votes],
        ].map(([label, value]) => <div key={String(label)} className="rounded-2xl border p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>)}
      </section>

      <section className="rounded-3xl border p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><h2 className="text-xl font-bold">Competition status</h2><p className="text-sm text-muted-foreground">Current: {data.competition.status}</p></div>
          <div className="flex flex-wrap gap-2">
            {["REGISTRATION_OPEN","REGISTRATION_CLOSED","IN_PROGRESS","VOTING_OPEN","COMPLETED","ARCHIVED"].map(status =>
              <Button key={status} variant={data.competition.status===status ? "default" : "outline"} size="sm" disabled={statusMutation.isPending || data.competition.status===status} onClick={() => statusMutation.mutate(status)}>{status.replaceAll("_"," ")}</Button>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border p-6">
        <h2 className="text-xl font-bold">Public voting window</h2>
        <p className="mt-2 text-sm text-muted-foreground">Set the server-enforced opening and closing times, then use the competition status to open voting.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium">
            Opens
            <input type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3" />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Closes
            <input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3" />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={() => {
            if (opensAt && closesAt && new Date(opensAt) >= new Date(closesAt)) {
              toast.error("Voting must close after it opens.");
              return;
            }
            windowMutation.mutate({
              opensAt: opensAt ? new Date(opensAt).toISOString() : null,
              closesAt: closesAt ? new Date(closesAt).toISOString() : null,
            });
          }} disabled={windowMutation.isPending}>
            Save voting window
          </Button>
          <Button variant="outline" onClick={() => votingMutation.mutate()} disabled={votingMutation.isPending}>Close voting now</Button>
        </div>
      </section>

      <section className="rounded-3xl border p-6">
        <h2 className="text-xl font-bold">Vote oversight</h2>
        <p className="mt-2 text-sm text-muted-foreground">Valid and suspicious activity for the active round.</p>
        {votes.isLoading ? <p className="mt-4 text-sm text-muted-foreground">Loading vote totals…</p> : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b text-muted-foreground"><th className="py-2">Contestant</th><th className="py-2">Votes</th><th className="py-2">Distinct voters</th><th className="py-2">Action</th></tr></thead>
              <tbody>
                {(votes.data as any[] ?? []).map((row) => <tr key={row.application_id} className="border-b">
                  <td className="py-2">{row.display_name} <span className="text-muted-foreground">@{row.handle}</span></td>
                  <td className="py-2">{row.valid_votes}</td>
                  <td className="py-2">{row.distinct_voters}</td>
                  <td className="py-2"><Button size="sm" variant="outline" onClick={() => voidMutation.mutate(row.application_id)} disabled={voidMutation.isPending}>Void contestant votes</Button></td>
                </tr>)}
              </tbody>
            </table>
          </div>
        )}
        {suspicious.data?.length ? <div className="mt-6 rounded-2xl bg-muted/50 p-4 text-sm"><strong>{suspicious.data.length}</strong> suspicious voter records detected.</div> : null}
      </section>


      <section className="rounded-3xl border p-6">
        <div className="flex items-center justify-between gap-4">
          <div><h2 className="text-xl font-bold">Judges</h2><p className="mt-1 text-sm text-muted-foreground">Manage appointed judges and their active status. Assignment is intentionally controlled separately from appointment.</p></div>
          <span className="rounded-full border px-3 py-1 text-xs">{judges.data?.length ?? 0} appointed</span>
        </div>
        {judges.isLoading ? <p className="mt-4 text-sm text-muted-foreground">Loading judges…</p> : (
          <div className="mt-5 space-y-3">
            {(judges.data ?? []).map((judge) => (
              <div key={judge.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4">
                <div>
                  <p className="font-semibold">{judge.display_name}</p>
                  <p className="text-sm text-muted-foreground">{judge.bio || "No bio"} · {judge.assigned_count} assigned · {judge.scored_count} scored</p>
                </div>
                <Button size="sm" variant={judge.is_active ? "outline" : "default"} disabled={judgeActiveMutation.isPending} onClick={() => judgeActiveMutation.mutate({ id: judge.id, active: !judge.is_active })}>
                  {judge.is_active ? "Deactivate" : "Activate"}
                </Button>
              </div>
            ))}
            {!judges.data?.length ? <p className="text-sm text-muted-foreground">No judges have been appointed yet.</p> : null}
          </div>
        )}
      </section>

      <section className="rounded-3xl border p-6">
        <h2 className="text-xl font-bold">Appoint a judge</h2>
        <p className="mt-1 text-sm text-muted-foreground">Choose an existing ArtistrySynk account. Appointment and assignment are separately audited server operations.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">Account
            <select className="h-10 w-full rounded-md border bg-background px-3" value={judgeUserId} onChange={(e) => { setJudgeUserId(e.target.value); const account = adminAccounts.data?.find((a) => a.user_id === e.target.value); if (account) setJudgeName(account.display_name || account.email); }}>
              <option value="">Choose account…</option>
              {(adminAccounts.data ?? []).map((account) => <option key={account.user_id} value={account.user_id}>{account.display_name} · {account.email}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">Judge display name
            <input className="h-10 w-full rounded-md border bg-background px-3" value={judgeName} onChange={(e) => setJudgeName(e.target.value)} placeholder="Name shown to contestants" />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">Short bio
            <input className="h-10 w-full rounded-md border bg-background px-3" value={judgeBio} onChange={(e) => setJudgeBio(e.target.value)} placeholder="Optional expertise or background" />
          </label>
        </div>
        <Button className="mt-4" onClick={() => appointMutation.mutate()} disabled={appointMutation.isPending || adminAccounts.isLoading}>{appointMutation.isPending ? "Appointing…" : "Appoint judge"}</Button>
        {adminAccounts.error ? <p className="mt-2 text-sm text-destructive">Could not load account list.</p> : null}
      </section>

      <section className="rounded-3xl border p-6">
        <h2 className="text-xl font-bold">Assign a judge to a contestant</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="space-y-1 text-sm">Judge
            <select className="h-10 w-full rounded-md border bg-background px-3" value={assignJudgeId} onChange={(e) => setAssignJudgeId(e.target.value)}>
              <option value="">Choose judge…</option>
              {(judges.data ?? []).filter((j) => j.is_active).map((j) => <option key={j.id} value={j.id}>{j.display_name}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">Contestant
            <select className="h-10 w-full rounded-md border bg-background px-3" value={assignApplicationId} onChange={(e) => setAssignApplicationId(e.target.value)}>
              <option value="">Choose contestant…</option>
              {(applications.data ?? []).map((a) => <option key={(a as {id:string}).id} value={(a as {id:string}).id}>{(a as {display_name:string;handle:string}).display_name} · @{(a as {handle:string}).handle}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">Round
            <select className="h-10 w-full rounded-md border bg-background px-3" value={assignRoundId} onChange={(e) => setAssignRoundId(e.target.value)}>
              <option value="">Choose round…</option>
              {data.rounds.map((round) => <option key={round.id} value={round.id}>{round.name}</option>)}
            </select>
          </label>
        </div>
        <Button className="mt-4" onClick={() => assignMutation.mutate()} disabled={assignMutation.isPending || !judges.data?.some((j) => j.id === assignJudgeId && j.is_active)}>{assignMutation.isPending ? "Assigning…" : "Create assignment"}</Button>
      </section>

      <section className="rounded-3xl border p-6">
        <h2 className="text-xl font-bold">Record a round decision</h2>
        <p className="mt-1 text-sm text-muted-foreground">Only decide entries in a round that is accepting decisions. The database validates round state.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="space-y-1 text-sm">Contestant
            <select className="h-10 w-full rounded-md border bg-background px-3" value={decisionApplicationId} onChange={(e) => setDecisionApplicationId(e.target.value)}>
              <option value="">Choose contestant…</option>
              {(applications.data ?? []).map((a) => <option key={(a as {id:string}).id} value={(a as {id:string}).id}>{(a as {display_name:string;handle:string}).display_name} · @{(a as {handle:string}).handle}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">Outcome
            <select className="h-10 w-full rounded-md border bg-background px-3" value={decisionOutcome} onChange={(e) => setDecisionOutcome(e.target.value as "ADVANCED" | "ELIMINATED" | "HELD")}>
              <option value="ADVANCED">Advance</option><option value="ELIMINATED">Eliminate</option><option value="HELD">Hold for review</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">Reason {decisionOutcome !== "ADVANCED" ? "(required)" : "(optional)"}
            <input className="h-10 w-full rounded-md border bg-background px-3" value={decisionReason} onChange={(e) => setDecisionReason(e.target.value)} placeholder="Document the decision" />
          </label>
        </div>
        <Button className="mt-4" onClick={() => decisionMutation.mutate()} disabled={decisionMutation.isPending}>{decisionMutation.isPending ? "Saving…" : "Record decision"}</Button>
      </section>

      <section className="rounded-3xl border p-6">
        <h2 className="text-xl font-bold">Correct a judge score</h2>
        <p className="mt-1 text-sm text-muted-foreground">Corrections require a reason and are written to the audit log. Only scores from the active round are listed.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="space-y-1 text-sm">Score
            <select className="h-10 w-full rounded-md border bg-background px-3" value={correctionScoreId} onChange={(e) => { setCorrectionScoreId(e.target.value); const item = scoreDetails.data?.find((score) => score.score_id === e.target.value); setCorrectedScore(item ? String(item.score) : ""); }}>
              <option value="">Choose score…</option>
              {(scoreDetails.data ?? []).map((item) => <option key={item.score_id} value={item.score_id}>{item.display_name} · {item.criterion_name} · {item.judge_name} ({item.score}/{item.max_score})</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">Corrected score
            <input type="number" min={0} max={scoreDetails.data?.find((item) => item.score_id === correctionScoreId)?.max_score ?? 100} step="0.5" className="h-10 w-full rounded-md border bg-background px-3" value={correctedScore} onChange={(e) => setCorrectedScore(e.target.value)} />
          </label>
          <label className="space-y-1 text-sm">Reason (required)
            <input className="h-10 w-full rounded-md border bg-background px-3" value={correctionReason} onChange={(e) => setCorrectionReason(e.target.value)} placeholder="Explain the correction" />
          </label>
        </div>
        <Button className="mt-4" onClick={() => correctionMutation.mutate()} disabled={correctionMutation.isPending || !correctionScoreId || !correctionReason.trim()}>{correctionMutation.isPending ? "Recording…" : "Record score correction"}</Button>
        {scoreDetails.error ? <p className="mt-2 text-sm text-destructive">Could not load score details for the active round.</p> : null}
      </section>

      <section className="rounded-3xl border p-6">
        <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold">Score-correction audit history</h2><span className="text-sm text-muted-foreground">{scoreCorrections.data?.length ?? 0} records</span></div>
        {scoreCorrections.isLoading ? <p className="mt-3 text-sm text-muted-foreground">Loading correction history…</p> : scoreCorrections.error ? <p className="mt-3 text-sm text-destructive">Correction history is unavailable.</p> : !scoreCorrections.data?.length ? <p className="mt-3 text-sm text-muted-foreground">No score corrections recorded.</p> : (
          <div className="mt-4 space-y-3">{scoreCorrections.data.map((item) => <article key={item.id} className="rounded-xl border p-4"><div className="flex flex-wrap justify-between gap-2"><span className="font-mono text-xs">{item.score_id}</span><time className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</time></div><p className="mt-2 text-sm">Actor: {item.actor_user_id}</p><pre className="mt-2 overflow-auto text-xs">{JSON.stringify(item.metadata, null, 2)}</pre></article>)}</div>
        )}
      </section>

      {activeRound ? <section className="rounded-3xl border p-6">
        <h2 className="text-xl font-bold">Active round readiness</h2>
        <p className="mt-1 text-sm text-muted-foreground">Server-calculated progression gate for the current round.</p>
        {roundProgress.isLoading ? <p className="mt-4 text-sm text-muted-foreground">Checking readiness…</p> : roundProgress.error ? <p className="mt-4 text-sm text-destructive">Could not load readiness.</p> : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Contestants", roundProgress.data?.contestants_in_round ?? 0],
              ["Assignments", roundProgress.data?.assigned_judges ?? 0],
              ["Judging pending", roundProgress.data?.judging_pending ?? 0],
              ["Unresolved", roundProgress.data?.unresolved ?? 0],
            ].map(([label, value]) => <div key={String(label)} className="rounded-2xl bg-muted/40 p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>)}
          </div>
        )}
      </section> : null}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">Rounds</h2>
        {data.rounds.map(round => (
          <div key={round.id} className="rounded-2xl border p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div><p className="text-sm text-muted-foreground">Round {round.sequence}</p><h3 className="text-lg font-semibold">{round.name}</h3><p className="text-sm text-muted-foreground">Current: {round.status}</p></div>
              <div className="flex flex-wrap gap-2">
                {["OPEN","JUDGING","DECISION_PENDING","DECIDED","CLOSED"].map(status =>
                  <Button key={status} variant="outline" size="sm" disabled={roundMutation.isPending || round.status===status} onClick={() => roundMutation.mutate({id:round.id,status})}>{status.replaceAll("_"," ")}</Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
