import { createFileRoute, Link } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import { CREATIVE_TALENT_HUNT_CATEGORIES } from "@/features/competitions/creativeTalentHunt";

export const Route = createFileRoute("/creative-talent-hunt/enter")({
  head: () => ({
    meta: [
      { title: "Enter the Creative Talent Hunt — ArtistrySynk" },
      {
        name: "description",
        content:
          "Enter the ArtistrySynk Creative Talent Hunt and turn your talent into an opportunity.",
      },
    ],
  }),
  component: EntryPage,
});

function EntryPage() {
  return (
    <PageTransition>
      <main className="min-h-screen bg-background text-foreground">
        <section className="mx-auto max-w-3xl px-6 py-16">
          <Link
            to="/creative-talent-hunt"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← Back to Creative Talent Hunt
          </Link>

          <div className="mt-10">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              ArtistrySynk Creative Talent Hunt
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              Your talent deserves an opportunity.
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              Registration will create or connect your ArtistrySynk creative
              identity. You will not need a separate contestant identity.
            </p>
          </div>

          <div className="mt-10 rounded-3xl border p-6 sm:p-8">
            <h2 className="text-xl font-bold">Choose your creative lane</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {CREATIVE_TALENT_HUNT_CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  className="rounded-2xl border px-5 py-4 text-left font-medium transition hover:bg-muted"
                  disabled
                  title="Registration flow is being connected to ArtistrySynk identity."
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="mt-8 rounded-2xl bg-muted/50 p-5 text-sm leading-6 text-muted-foreground">
              <strong className="text-foreground">Coming next:</strong>{" "}
              category selection will feed directly into the ArtistrySynk
              profile, portfolio and competition application flow.
            </div>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}
