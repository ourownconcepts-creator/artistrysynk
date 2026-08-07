import { Link } from "react-router-dom";
import { Footer } from "@/components/Footer";
import { PageSEO, CollectionPageSchema } from "@/components/seo";
import { CITY_LANDINGS, DISCIPLINE_LANDINGS } from "@/lib/seoLandings";

const BASE = "https://artistrysynk.app";

const LocationsIndex = () => (
  <div className="min-h-screen">
    <PageSEO
      title="Creative Talent by City — Locations"
      description="Browse creative professionals by city on ArtistrySynk. Find musicians, producers, designers, photographers and developers near you."
      keywords="creatives by city, local creative talent, creative directory, find creatives near me"
      canonicalUrl={`${BASE}/locations`}
      breadcrumbs={[
        { name: "Home", url: `${BASE}/` },
        { name: "Locations", url: `${BASE}/locations` },
      ]}
    />
    <CollectionPageSchema
      name="Creative talent by city"
      description="Directory of city landing pages for creative professionals on ArtistrySynk."
      url={`${BASE}/locations`}
      items={CITY_LANDINGS.map((c) => ({ name: `Creatives in ${c.city}`, url: `${BASE}/locations/${c.slug}` }))}
    />
    <main className="container mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Creative talent by city</h1>
      <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
        Pick a city to see the creators building there — then browse their portfolios and start a collaboration.
      </p>

      <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 list-none p-0">
        {CITY_LANDINGS.map((c) => (
          <li key={c.slug}>
            <Link
              to={`/locations/${c.slug}`}
              className="block rounded-lg border p-4 transition-colors hover:border-primary/50"
            >
              <span className="font-semibold">Creatives in {c.city}</span>
              <span className="block text-sm text-muted-foreground">{c.country}</span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-14" aria-labelledby="disciplines">
        <h2 id="disciplines" className="mb-4 text-2xl font-semibold">
          Browse by discipline
        </h2>
        <ul className="flex flex-wrap gap-3 list-none p-0">
          {DISCIPLINE_LANDINGS.map((d) => (
            <li key={d.slug}>
              <Link to={`/${d.slug}`} className="text-sm text-primary hover:underline">
                {d.heading}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
    <Footer />
  </div>
);

export default LocationsIndex;
