import { createFileRoute, Link } from "@tanstack/react-router";
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
  const client = useQueryClient();
  const snapshot = useQuery({ queryKey: ["talent-hunt-admin-snapshot"], queryFn: getTalentHuntAdminSnapshot, enabled: Boolean(user) });

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
