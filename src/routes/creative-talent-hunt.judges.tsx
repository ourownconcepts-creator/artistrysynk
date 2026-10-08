import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/creative-talent-hunt/judges")({
  staticData: { sitemap: true },
  head: () => ({ meta: [
    { title: "Creative Talent Hunt Judges — ArtistrySynk" },
    { name: "description", content: "Meet the judges evaluating creators in the ArtistrySynk Creative Talent Hunt." },
  ]}),
  component: JudgesPage,
});

function JudgesPage() {
  const judges = useQuery({
    queryKey: ["creative-talent-hunt-public-judges"],
    queryFn: async () => {
      const { data: competition, error: competitionError } = await supabase
        .from("competition_competitions").select("id").eq("slug","creative-talent-hunt").single();
      if (competitionError) throw competitionError;
      const { data, error } = await supabase.from("competition_judges")
        .select("display_name,bio").eq("competition_id", competition.id).eq("is_active",true).order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  return <main className="mx-auto max-w-5xl px-6 py-14 sm:py-20">
    <header className="max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Creative Talent Hunt</p>
      <h1 className="mt-3 text-4xl font-bold">Meet the judges</h1>
      <p className="mt-4 text-lg leading-8 text-muted-foreground">The people helping ArtistrySynk identify creativity, craft, originality and potential.</p>
    </header>
    {judges.isLoading ? <p className="mt-10 text-muted-foreground">Loading judges…</p> :
      judges.error ? <p className="mt-10 text-destructive">Judges are currently unavailable.</p> :
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {judges.data.map((judge) => <article key={judge.display_name} className="rounded-3xl border p-7">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-xl font-bold">{judge.display_name.slice(0,1).toUpperCase()}</div>
          <h2 className="mt-5 text-xl font-semibold">{judge.display_name}</h2>
          <p className="mt-3 leading-7 text-muted-foreground">{judge.bio || "Creative industry judge."}</p>
        </article>)}
        {!judges.data.length ? <div className="rounded-3xl border p-7 text-muted-foreground">Judge profiles will appear here when the panel is announced.</div> : null}
      </div>}
  </main>;
}
