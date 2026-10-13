import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CthLayout, StateBox } from "@/features/competitions/CthLayout";
import { listPublicJudges } from "@/features/competitions/operations.service";

export const Route = createFileRoute("/creative-talent-hunt/judges")({
  head: () => ({
    meta: [
      { title: "Judges — Creative Talent Hunt | ArtistrySynk" },
      { name: "description", content: "Meet the judging panel of the ArtistrySynk Creative Talent Hunt." },
      { property: "og:title", content: "Judges — Creative Talent Hunt" },
      { property: "og:description", content: "The panel scoring creativity, skill, originality, impact and potential." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JudgesPage,
});

function JudgesPage() {
  const [judges, setJudges] = useState<Array<{ display_name: string; bio: string }> | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { void listPublicJudges().then(setJudges).catch(() => setError(true)); }, []);

  return (
    <CthLayout title="The judging panel" intro="Every entry is scored on Creativity, Skill / Execution, Originality, Presentation / Impact and Overall Potential.">
      {error ? <StateBox tone="error">Could not load the panel.</StateBox>
        : !judges ? <StateBox>Loading…</StateBox>
        : judges.length === 0 ? <StateBox>The judging panel will be announced soon.</StateBox>
        : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {judges.map((j) => (
              <article key={j.display_name} className="rounded-3xl border p-6">
                <h2 className="text-xl font-bold">{j.display_name}</h2>
                {j.bio && <p className="mt-3 text-sm leading-6 text-muted-foreground">{j.bio}</p>}
              </article>
            ))}
          </div>
        )}
    </CthLayout>
  );
}
