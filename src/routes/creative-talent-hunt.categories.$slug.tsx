import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CthLayout, StateBox } from "@/features/competitions/CthLayout";
import { listCategories, type Category } from "@/features/competitions/operations.service";
import { listPublicCreativeTalentHuntEntries } from "@/features/competitions/creativeTalentHunt.service";

export const Route = createFileRoute("/creative-talent-hunt/categories/$slug")({
  head: ({ params }) => {
    const name = params.slug.replace(/-/g, " ");
    return {
      meta: [
        { title: `${name} — Creative Talent Hunt | ArtistrySynk` },
        { name: "description", content: `Discover approved ${name} entries in the ArtistrySynk Creative Talent Hunt.` },
        { property: "og:title", content: `${name} — Creative Talent Hunt` },
        { property: "og:description", content: `Approved ${name} contestants on ArtistrySynk.` },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: CategoryPage,
});

type Entry = { id: string; handle: string; display_name: string; location: string; bio: string; category_id: string };

function CategoryPage() {
  const { slug } = Route.useParams();
  const [cats, setCats] = useState<Category[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    setState("loading");
    void Promise.all([listCategories(), listPublicCreativeTalentHuntEntries()])
      .then(([c, e]) => { setCats(c); setEntries(e as Entry[]); setState("ready"); })
      .catch(() => setState("error"));
  }, [slug]);

  const category = cats.find((c) => c.slug === slug);
  const list = category ? entries.filter((e) => e.category_id === category.id) : [];

  return (
    <CthLayout eyebrow="Category" title={category?.name ?? "Category"} intro="Find your people. Show your talent. Get discovered.">
      <div className="mb-8 flex flex-wrap gap-2">
        {cats.map((c) => (
          <Link key={c.id} to="/creative-talent-hunt/categories/$slug" params={{ slug: c.slug }}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${c.slug === slug ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
            {c.name}
          </Link>
        ))}
      </div>
      {state === "loading" ? <StateBox>Loading…</StateBox>
        : state === "error" ? <StateBox tone="error">Could not load this category.</StateBox>
        : !category ? <StateBox>This category doesn't exist.</StateBox>
        : list.length === 0 ? <StateBox>No approved public entries in {category.name} yet.</StateBox>
        : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((e) => (
              <Link key={e.id} to="/creative-talent-hunt/contestants/$slug" params={{ slug: e.handle }} className="rounded-3xl border p-6 hover:bg-muted/40">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">@{e.handle}</p>
                <h2 className="mt-1 text-xl font-bold">{e.display_name}</h2>
                {e.location && <p className="mt-2 text-sm text-muted-foreground">{e.location}</p>}
                {e.bio && <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{e.bio}</p>}
              </Link>
            ))}
          </div>
        )}
    </CthLayout>
  );
}
