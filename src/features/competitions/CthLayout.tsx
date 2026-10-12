import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";

export const CTH_NAV = [
  { label: "Overview", to: "/creative-talent-hunt" as const },
  { label: "Contestants", to: "/creative-talent-hunt/contestants" as const },
  { label: "Leaderboard", to: "/creative-talent-hunt/leaderboard" as const },
  { label: "Judges", to: "/creative-talent-hunt/judges" as const },
  { label: "Prizes", to: "/creative-talent-hunt/prizes" as const },
  { label: "Rules", to: "/creative-talent-hunt/rules" as const },
  { label: "My entry", to: "/creative-talent-hunt/dashboard" as const },
];

/** Shared page frame for public Creative Talent Hunt pages, inside the ArtistrySynk shell. */
export function CthLayout({ eyebrow, title, intro, children }: { eyebrow?: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <PageTransition>
      <main className="min-h-screen bg-background text-foreground">
        <section className="border-b">
          <div className="mx-auto max-w-6xl px-6 py-6">
            <nav aria-label="Creative Talent Hunt" className="flex flex-wrap gap-2">
              {CTH_NAV.map((item) => (
                <Link key={item.to} to={item.to} activeOptions={{ exact: true }}
                  activeProps={{ className: "bg-primary text-primary-foreground border-primary" }}
                  className="rounded-full border px-4 py-1.5 text-sm font-medium hover:bg-muted">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow ?? "Creative Talent Hunt"}</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
          {intro && <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">{intro}</p>}
          <div className="mt-10">{children}</div>
        </section>
      </main>
    </PageTransition>
  );
}

export function StateBox({ children, tone }: { children: ReactNode; tone?: "error" }) {
  return <div className={`rounded-3xl border p-8 ${tone === "error" ? "text-destructive" : "text-muted-foreground"}`}>{children}</div>;
}

export function ListCard({ title, items, empty }: { title: string; items: string[] | undefined; empty: string }) {
  return (
    <article className="rounded-3xl border p-6">
      <h2 className="text-xl font-bold">{title}</h2>
      <ul className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground">
        {(items ?? []).map((item) => (
          <li key={item} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />{item}</li>
        ))}
        {(!items || items.length === 0) && <li>{empty}</li>}
      </ul>
    </article>
  );
}
