import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/creative-talent-hunt/dashboard")({
  staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "My Talent Hunt Journey — ArtistrySynk" }, { name: "robots", content: "noindex" }] }),
  component: TalentHuntDashboardPage,
});

function TalentHuntDashboardPage() {
  const dashboard = useQuery({
    queryKey: ["my-creative-talent-hunt-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_creative_talent_hunt_dashboard");
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  if (dashboard.isLoading) return <main className="mx-auto max-w-4xl px-6 py-20 text-muted-foreground">Loading your journey…</main>;

  if (!dashboard.data) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="text-3xl font-bold">Your Talent Hunt journey</h1>
        <p className="mt-3 text-muted-foreground">You have not started an entry yet.</p>
        <Button asChild className="mt-6"><Link to="/creative-talent-hunt/enter">Start your entry</Link></Button>
      </main>
    );
  }

  const steps = [
    ["Entry", ["DRAFT", "PENDING_REVIEW", "SUBMITTED"].includes(dashboard.data.submission_state) || dashboard.data.status !== "DRAFT"],
    ["Review", ["PENDING_REVIEW", "APPROVED"].includes(dashboard.data.status)],
    ["Competition", ["ROUND_ACTIVE", "ADVANCED", "WINNER"].includes(dashboard.data.progress_state)],
    ["Opportunity", dashboard.data.progress_state === "WINNER" || dashboard.data.status === "APPROVED"],
  ];

  return (
    <main className="mx-auto max-w-4xl px-6 py-14 sm:py-20">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">ArtistrySynk Creative Talent Hunt</p>
      <h1 className="mt-3 text-4xl font-bold">{dashboard.data.display_name}</h1>
      <p className="mt-2 text-muted-foreground">@{dashboard.data.handle} · {dashboard.data.category_name}</p>

      <div className="mt-10 rounded-3xl border p-6 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-4">
          {steps.map(([label, complete]) => (
            <div key={String(label)} className="rounded-2xl bg-muted/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
              <p className="mt-2 font-semibold">{complete ? "Complete / active" : "Next stage"}</p>
            </div>
          ))}
        </div>

        <dl className="mt-8 grid gap-5 sm:grid-cols-2">
          <div><dt className="text-sm text-muted-foreground">Status</dt><dd className="mt-1 font-semibold">{dashboard.data.status}</dd></div>
          <div><dt className="text-sm text-muted-foreground">Journey</dt><dd className="mt-1 font-semibold">{dashboard.data.progress_state}</dd></div>
          <div><dt className="text-sm text-muted-foreground">Current round</dt><dd className="mt-1 font-semibold">{dashboard.data.current_round_name || "Awaiting review"}</dd></div>
          <div><dt className="text-sm text-muted-foreground">Reference</dt><dd className="mt-1 font-mono font-semibold">{dashboard.data.reference_code || "Not submitted"}</dd></div>
        </dl>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild><Link to="/creative-talent-hunt/enter">View my entry</Link></Button>
          <Button asChild variant="outline"><Link to="/creative-talent-hunt/contestants">Explore creators</Link></Button>
        </div>
      </div>
    </main>
  );
}
