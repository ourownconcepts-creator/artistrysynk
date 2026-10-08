import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/hooks/useSession";
import {
  listCreativeTalentHuntCriteria,
  listCreativeTalentHuntJudgeQueue,
  saveCreativeTalentHuntScores,
} from "@/features/competitions/creativeTalentHunt.operations";

export const Route = createFileRoute("/creative-talent-hunt/judge")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Judge Workspace — ArtistrySynk Creative Talent Hunt" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CreativeTalentHuntJudgePage,
});

function CreativeTalentHuntJudgePage() {
  const { user, ready } = useSession();
  const queryClient = useQueryClient();
  const queue = useQuery({
    queryKey: ["creative-talent-hunt-judge-queue", user?.id],
    queryFn: () => listCreativeTalentHuntJudgeQueue(user!.id),
    enabled: Boolean(user),
  });
  const [openId, setOpenId] = useState<string | null>(null);

  if (!ready) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!user) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-20">
        <h1 className="text-3xl font-semibold">Judge workspace</h1>
        <p className="mt-3 text-muted-foreground">Sign in with your appointed judge account.</p>
        <Button asChild className="mt-6">
          <Link to="/auth">Sign in</Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl space-y-8 px-4 py-12 sm:px-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Creative Talent Hunt
        </p>
        <h1 className="mt-3 text-4xl font-semibold">Judge workspace</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Score only the contestants assigned to your judge account. Competition progression remains
          an administrator responsibility.
        </p>
      </header>

      {queue.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading your assignments…</p>
      ) : queue.data?.length ? (
        <div className="space-y-4">
          {queue.data.map((entry) => (
            <article key={entry.assignment_id} className="rounded-2xl border border-border/60 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold">{entry.display_name}</h2>
                  <p className="mt-1 text-sm text-primary">{entry.category_name}</p>
                  <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
                    {entry.round_name}
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">{entry.bio}</p>
                </div>
                <Button onClick={() => setOpenId(openId === entry.assignment_id ? null : entry.assignment_id)}>
                  {openId === entry.assignment_id ? "Close scorecard" : "Open scorecard"}
                </Button>
              </div>

              {openId === entry.assignment_id && (
                <Scorecard assignmentId={entry.assignment_id} roundId={entry.round_id} />
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-border/60 p-8 text-sm text-muted-foreground">
          No active contestant assignments are available for your account.
        </div>
      )}
    </section>
  );
}

function Scorecard({ assignmentId, roundId }: { assignmentId: string; roundId: string }) {
  const queryClient = useQueryClient();
  const criteria = useQuery({
    queryKey: ["creative-talent-hunt-criteria", roundId],
    queryFn: () => listCreativeTalentHuntCriteria(roundId),
  });
  const [values, setValues] = useState<Record<string, string>>({});
  const [comment, setComment] = useState("");

  const save = useMutation({
    mutationFn: () =>
      saveCreativeTalentHuntScores(
        assignmentId,
        (criteria.data ?? [])
          .map((criterion) => ({
            criterionId: criterion.id,
            score: Number(values[criterion.id] ?? ""),
            comment,
          }))
          .filter((item) => Number.isFinite(item.score)),
      ),
    onSuccess: () => {
      toast.success("Scores saved");
      void queryClient.invalidateQueries({ queryKey: ["creative-talent-hunt-judge-queue"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Scores could not be saved."),
  });

  if (criteria.isLoading) return <p className="mt-6 text-sm text-muted-foreground">Loading scorecard…</p>;

  return (
    <div className="mt-6 border-t border-border/60 pt-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(criteria.data ?? []).map((criterion) => (
          <div key={criterion.id} className="space-y-2">
            <Label htmlFor={`score-${criterion.id}`}>
              {criterion.name} <span className="text-xs text-muted-foreground">/ {criterion.max_score}</span>
            </Label>
            <Input
              id={`score-${criterion.id}`}
              type="number"
              min={0}
              max={criterion.max_score}
              step="0.5"
              value={values[criterion.id] ?? ""}
              onChange={(event) => setValues((current) => ({ ...current, [criterion.id]: event.target.value }))}
            />
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        <Label htmlFor={`comment-${assignmentId}`}>Private judge comment</Label>
        <textarea
          id={`comment-${assignmentId}`}
          className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
      </div>
      <Button className="mt-4" onClick={() => save.mutate()} disabled={save.isPending || !(criteria.data ?? []).length}>
        {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
        Save scores
      </Button>
    </div>
  );
}
