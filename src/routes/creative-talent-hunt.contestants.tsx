import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import { listPublicCreativeTalentHuntEntries } from "@/features/competitions/creativeTalentHunt.service";

export const Route = createFileRoute("/creative-talent-hunt/contestants")({
  head: () => ({
    meta: [
      { title: "Talent Hunt Creators — ArtistrySynk" },
      {
        name: "description",
        content:
          "Discover public creators entering the ArtistrySynk Creative Talent Hunt.",
      },
    ],
  }),
  component: ContestantsPage,
});

type Entry = {
  id: string;
  handle: string;
  display_name: string;
  location: string;
  bio: string;
  audition_url: string;
  status: string;
  category_id: string;
  is_public: boolean;
};

function ContestantsPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void listPublicCreativeTalentHuntEntries()
      .then((data) => setEntries(data as Entry[]))
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "Could not load creators."),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageTransition>
      <main className="min-h-screen bg-background text-foreground">
        <section className="border-b">
          <div className="mx-auto max-w-6xl px-6 py-8">
            <Link
              to="/creative-talent-hunt"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              ← Creative Talent Hunt
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-14 sm:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              Discover the creators
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-6xl">
              Talent deserves to be seen.
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              Explore creators who have chosen to make their Talent Hunt entry public.
              Their competition journey can become the beginning of their ArtistrySynk journey.
            </p>
          </div>

          {loading ? (
            <div className="mt-12 rounded-3xl border p-8 text-muted-foreground">
              Loading creators…
            </div>
          ) : error ? (
            <div className="mt-12 rounded-3xl border p-8 text-destructive">
              {error}
            </div>
          ) : entries.length === 0 ? (
            <div className="mt-12 rounded-3xl border p-8">
              <h2 className="text-xl font-bold">The directory is opening.</h2>
              <p className="mt-2 text-muted-foreground">
                Public creator entries will appear here as participants opt in and are approved.
              </p>
              <Link
                to="/creative-talent-hunt/enter"
                className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
              >
                Be one of the first
              </Link>
            </div>
          ) : (
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {entries.map((entry) => (
                <article key={entry.id} className="rounded-3xl border p-6 transition hover:-translate-y-0.5 hover:bg-muted/40">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                        @{entry.handle}
                      </p>
                      <h2 className="mt-1 text-xl font-bold">{entry.display_name}</h2>
                    </div>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                      Creator
                    </span>
                  </div>
                  {entry.location && (
                    <p className="mt-4 text-sm text-muted-foreground">{entry.location}</p>
                  )}
                  {entry.bio && (
                    <p className="mt-4 line-clamp-4 text-sm leading-6 text-muted-foreground">
                      {entry.bio}
                    </p>
                  )}
                  {entry.audition_url && (
                    <a
                      href={entry.audition_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-5 inline-flex text-sm font-semibold text-primary hover:underline"
                    >
                      View work →
                    </a>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </PageTransition>
  );
}
