import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import { getPublicLeaderboard, type PublicLeaderboardRow } from "@/features/competitions/judging.service";

export const Route = createFileRoute("/creative-talent-hunt_/leaderboard")({
  head: () => ({
    meta: [
      { title: "Creative Talent Hunt Leaderboard — ArtistrySynk" },
      { name: "description", content: "See the top-ranked creators in the ArtistrySynk Creative Talent Hunt, scored by our judging panel." },
      { property: "og:title", content: "Creative Talent Hunt Leaderboard — ArtistrySynk" },
      { property: "og:description", content: "Top-ranked creators in the ArtistrySynk Creative Talent Hunt." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const [rows, setRows] = useState<PublicLeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void getPublicLeaderboard()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load the leaderboard."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageTransition>
      <main className="min-h-screen bg-background text-foreground">
        <section className="mx-auto max-w-4xl px-6 py-14">
          <Link to="/creative-talent-hunt" className="text-sm text-muted-foreground hover:text-foreground">← Creative Talent Hunt</Link>
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-primary">Judges' ranking</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Leaderboard</h1>
          <p className="mt-4 text-muted-foreground">Scores out of 100, averaged across our judging panel.</p>

          {loading ? (
            <div className="mt-10 rounded-3xl border p-8 text-muted-foreground">Loading leaderboard…</div>
          ) : error ? (
            <div className="mt-10 rounded-3xl border p-8 text-destructive">{error}</div>
          ) : rows.length === 0 ? (
            <div className="mt-10 rounded-3xl border p-8">
              <h2 className="text-xl font-bold">Results aren't published yet</h2>
              <p className="mt-2 text-muted-foreground">Judging is underway. Check back soon to see who's leading.</p>
            </div>
          ) : (
            <ol className="mt-10 divide-y rounded-3xl border">
              {rows.map((r) => (
                <li key={r.application_id} className="flex items-center gap-4 p-5">
                  <span className="w-10 text-2xl font-bold text-primary">{r.rank}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{r.display_name} <span className="font-normal text-muted-foreground">@{r.handle}</span></p>
                    <p className="text-sm text-muted-foreground">{r.category_name}</p>
                  </div>
                  <span className="text-xl font-bold">{r.combined_score}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>
    </PageTransition>
  );
}
