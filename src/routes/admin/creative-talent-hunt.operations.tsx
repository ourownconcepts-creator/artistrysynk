import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { getTalentHuntAdminSnapshot, setTalentHuntRoundStatus, setTalentHuntStatus, getTalentHuntVotingSummary, getTalentHuntVoteTotals, getTalentHuntSuspiciousVotes, voidTalentHuntVotes, setTalentHuntVotingWindow, closeTalentHuntVoting } from "@/features/competitions/creativeTalentHunt.admin";
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
