import { useEffect, useState } from "react";
import { Link, useParams } from "@/lib/router-compat";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Footer } from "@/components/Footer";
import { PageSEO, CollectionPageSchema } from "@/components/seo";
import { PublicCreatorGrid, type PublicCreator } from "@/components/seo/PublicCreatorGrid";
import { CITY_LANDINGS, DISCIPLINE_LANDINGS, cityDescription, cityTitle, getCityBySlug } from "@/lib/seoLandings";
import NotFound from "@/pages/NotFound";

const BASE = "https://artistrysynk.app";

const LocationLanding = () => {
  const { citySlug } = useParams();
  const city = citySlug ? getCityBySlug(citySlug) : undefined;
  const [creators, setCreators] = useState<PublicCreator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!city) return;
    let active = true;
    setLoading(true);
    supabase
      .rpc("list_public_profiles", { _role: undefined, _city: city.city, _limit: 48, _offset: 0 })
      .then(({ data }) => {
        if (!active) return;
        setCreators((data as PublicCreator[]) ?? []);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [city]);

  if (!city) return <NotFound />;

  const url = `${BASE}/locations/${city.slug}`;

  return (
    <div className="min-h-screen">
      <PageSEO
        title={cityTitle(city)}
        description={cityDescription(city)}
        keywords={`creatives in ${city.city}, ${city.city} musicians, ${city.city} producers, ${city.city} designers, ${city.city} photographers`}
        canonicalUrl={url}
        breadcrumbs={[
          { name: "Home", url: `${BASE}/` },
          { name: "Locations", url: `${BASE}/locations` },
          { name: city.city, url },
        ]}
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Place",
            name: city.city,
            address: {
              "@type": "PostalAddress",
              addressLocality: city.city,
              addressCountry: city.country,
            },
          })}
        </script>
      </Helmet>
      <CollectionPageSchema
        name={`Creatives in ${city.city}`}
        description={cityDescription(city)}
        url={url}
        items={creators.map((c) => ({ name: c.full_name, url: `${BASE}/profile/${c.username ?? c.id}` }))}
      />

      <main className="container mx-auto max-w-6xl px-4 py-16">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Home
          </Link>{" "}
          /{" "}
          <Link to="/locations" className="hover:text-foreground">
            Locations
          </Link>{" "}
          / <span className="text-foreground">{city.city}</span>
        </nav>

        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Creatives in {city.city}</h1>
        <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
          Musicians, producers, designers, photographers, dancers, actors and developers based in {city.city},{" "}
          {city.country}. Browse public profiles, review portfolio highlights and start collaborating locally.
        </p>

        <section className="mt-10" aria-labelledby="city-creators">
          <h2 id="city-creators" className="mb-4 text-2xl font-semibold">
            Creators in {city.city}
          </h2>
          <PublicCreatorGrid
            creators={creators}
            loading={loading}
            emptyMessage={`No public profiles in ${city.city} yet — be the first to join.`}
          />
        </section>

        <section className="mt-14" aria-labelledby="city-disciplines">
          <h2 id="city-disciplines" className="mb-4 text-2xl font-semibold">
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

        <section className="mt-10" aria-labelledby="other-cities">
          <h2 id="other-cities" className="mb-4 text-2xl font-semibold">
            Other cities
          </h2>
          <ul className="flex flex-wrap gap-3 list-none p-0">
            {CITY_LANDINGS.filter((c) => c.slug !== city.slug).map((c) => (
              <li key={c.slug}>
                <Link to={`/locations/${c.slug}`} className="text-sm text-primary hover:underline">
                  {c.city}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default LocationLanding;
