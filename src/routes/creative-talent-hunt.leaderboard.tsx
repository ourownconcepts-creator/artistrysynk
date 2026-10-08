import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { listCreativeTalentHuntResults } from "@/features/competitions/creativeTalentHunt.results";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/creative-talent-hunt/leaderboard")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Creative Talent Hunt Leaderboard — ArtistrySynk" },
      { name: "description", content: "Follow Creative Talent Hunt results, public votes and judge scores on ArtistrySynk." },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const round = useQuery({
    queryKey: ["creative-talent-hunt-active-round"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competition_rounds")
        .select("id,name,status,public_voting_enabled,scoring_enabled,sequence")
        .eq("competition_id", (await supabase
          .from("competition_competitions")
          .select("id")
          .eq("slug", "creative-talent-hunt")
          .single()).data?.id ?? "")
        .order("sequence", { ascending: true })
        .limit(1);
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  const results = useQuery({
    queryKey: ["creative-talent-hunt-results", round.data?.id],
    queryFn: async () => {
      return listCreativeTalentHuntResults(round.data!.id);
    },
    enabled: Boolean(round.data?.id),
  });

  return (
    <section className="mx-auto w-full max-w-5xl space-y-8 px-4 py-12 sm:px-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Creative Talent Hunt</p>
        <h1 className="mt-3 text-4xl font-semibold">Leaderboard</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          See how contestants are progressing as the Hunt moves from discovery to opportunity.
        </p>
      </header>

      {!round.isLoading && !round.data ? (
        <div className="rounded-2xl border p-8 text-muted-foreground">
          The leaderboard will appear when a competition round is active.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border">
          {(results.data ?? []).map((entry: any, index: number) => (
            <div key={entry.application_id} className="grid grid-cols-[3rem_1fr_auto] items-center gap-4 border-b p-5 last:border-b-0">
              <span className="text-lg font-semibold text-muted-foreground">{index + 1}</span>
              <div>
                <Link to="/creative-talent-hunt/contestants" className="font-semibold hover:underline">
                  {entry.display_name}
                </Link>
                <p className="text-sm text-muted-foreground">{entry.category_name} · @{entry.handle}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{Number(entry.combined_score ?? 0).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{entry.public_votes ?? 0} public votes</p>
              </div>
            </div>
          ))}
          {!results.isLoading && !(results.data ?? []).length && (
            <div className="p-8 text-muted-foreground">No public results yet.</div>
          )}
        </div>
      )}

      <Button asChild variant="outline"><Link to="/creative-talent-hunt/contestants">Explore contestants</Link></Button>
    </section>
  );
}
