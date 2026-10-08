import { createFileRoute, Link } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import {
  ARTISTRYSYNK_CREATIVE_TALENT_HUNT,
  CREATIVE_TALENT_HUNT_CATEGORIES,
} from "@/features/competitions/creativeTalentHunt";

export const Route = createFileRoute("/creative-talent-hunt")({
  head: () => ({
    meta: [
      { title: "ArtistrySynk Creative Talent Hunt" },
      {
        name: "description",
        content:
          "Discover emerging creatives, enter competitions and get discovered on ArtistrySynk.",
      },
      {
        property: "og:title",
        content: "ArtistrySynk Creative Talent Hunt",
      },
      {
        property: "og:description",
        content:
          "Your talent deserves more than applause. It deserves an opportunity.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: CreativeTalentHuntPage,
});

function CreativeTalentHuntPage() {
  return (
    <PageTransition>
      <main className="min-h-screen bg-background text-foreground">
        <section className="border-b">
          <div className="mx-auto max-w-6xl px-6 py-8">
            <Link
              to="/"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              ArtistrySynk
            </Link>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              Discover • Create • Connect • Rise
            </p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              ArtistrySynk Creative Talent Hunt
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Your talent deserves more than applause. It deserves an
              opportunity. Enter, build your ArtistrySynk creative identity,
              get discovered and connect with people who can help you take the
              next step.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/creative-talent-hunt/enter"
                className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
              >
                Enter the Talent Hunt
              </Link>
              <Link
                to="/creative-talent-hunt/contestants"
                className="rounded-full border px-6 py-3 text-sm font-semibold"
              >
                Explore Talent
              </Link>
              <a
                href="#categories"
                className="rounded-full border px-6 py-3 text-sm font-semibold"
              >
                Explore Categories
              </a>
            </div>
          </div>
        </section>
        <section id="categories" className="border-y bg-muted/30">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="text-2xl font-bold">Creative categories</h2>
            <p className="mt-2 text-muted-foreground">
              One discovery ecosystem for different forms of creativity.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {CREATIVE_TALENT_HUNT_CATEGORIES.map((category) => (
                <div key={category} className="rounded-2xl border bg-background p-5">
                  <span className="font-semibold">{category}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="rounded-3xl border p-8 sm:p-10">
            <p className="text-sm font-medium text-muted-foreground">
              Competition architecture
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              One ArtistrySynk identity. Many opportunities.
            </h2>
            <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">
              Competition participation is linked to an existing ArtistrySynk
              identity. The competition does not create a separate contestant
              ecosystem. This same infrastructure can later support sports,
              football, gaming and other competition domains.
            </p>
            <div className="mt-6 text-sm text-muted-foreground">
              {ARTISTRYSYNK_CREATIVE_TALENT_HUNT.domain} ·{" "}
              {ARTISTRYSYNK_CREATIVE_TALENT_HUNT.type}
            </div>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}
