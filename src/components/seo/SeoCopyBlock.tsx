import { Link } from "@/lib/router-compat";

export interface SeoCopy {
  heading: string;
  intro: string;
  sections: { h: string; p: string }[];
  links?: { to: string; label: string }[];
}

/** Original, crawlable explanatory copy shown under a page's main content. */
export function SeoCopyBlock({ copy }: { copy: SeoCopy }) {
  return (
    <section className="container mx-auto max-w-4xl px-4 py-12" aria-labelledby="seo-copy-heading">
      <h2 id="seo-copy-heading" className="text-2xl font-bold tracking-tight md:text-3xl">{copy.heading}</h2>
      <p className="mt-3 text-muted-foreground">{copy.intro}</p>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {copy.sections.map((s) => (
          <div key={s.h}>
            <h3 className="font-semibold">{s.h}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.p}</p>
          </div>
        ))}
      </div>
      {copy.links && (
        <nav aria-label="Related pages" className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {copy.links.map((l) => (
            <Link key={l.to} to={l.to} className="font-medium text-primary hover:underline">{l.label} →</Link>
          ))}
        </nav>
      )}
    </section>
  );
}
