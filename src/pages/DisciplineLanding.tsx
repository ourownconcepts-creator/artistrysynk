import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Footer } from "@/components/Footer";
import { PageSEO, CollectionPageSchema } from "@/components/seo";
import { PublicCreatorGrid, type PublicCreator } from "@/components/seo/PublicCreatorGrid";
import { DISCIPLINE_LANDINGS, getDisciplineBySlug } from "@/lib/seoLandings";
import { CITY_LANDINGS } from "@/lib/seoLandings";
import NotFound from "@/pages/NotFound";

const BASE = "https://artistrysynk.app";

const DisciplineLanding = () => {
  const { pathname } = useLocation();
  const slug = pathname.replace(/^\/+/, "").replace(/\/+$/, "");
  const discipline = getDisciplineBySlug(slug);
  const [creators, setCreators] = useState<PublicCreator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!discipline) return;
    let active = true;
    setLoading(true);
    supabase
      .rpc("list_public_profiles", { _role: discipline.role, _city: null, _limit: 48, _offset: 0 })
      .then(({ data }) => {
        if (!active) return;
        setCreators((data as PublicCreator[]) ?? []);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [discipline]);

  if (!discipline) return <NotFound />;

  const url = `${BASE}/${discipline.slug}`;

  return (
    <div className="min-h-screen">
      <PageSEO
        title={discipline.title}
        description={discipline.description}
        keywords={discipline.keywords}
        canonicalUrl={url}
        breadcrumbs={[
          { name: "Home", url: `${BASE}/` },
          { name: discipline.heading, url },
        ]}
      />
      <CollectionPageSchema
        name={discipline.heading}
        description={discipline.description}
        url={url}
        items={creators.map((c) => ({
          name: c.full_name,
          url: `${BASE}/profile/${c.username ?? c.id}`,
        }))}
      />

      <main className="container mx-auto max-w-6xl px-4 py-16">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Home
          </Link>{" "}
          / <span className="text-foreground">{discipline.heading}</span>
        </nav>

        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{discipline.heading}</h1>
        <p className="mt-4 max-w-3xl text-lg text-muted-foreground">{discipline.intro}</p>

        <section className="mt-10" aria-labelledby="creators-heading">
          <h2 id="creators-heading" className="mb-4 text-2xl font-semibold">
            Featured profiles
          </h2>
          <PublicCreatorGrid
            creators={creators}
            loading={loading}
            emptyMessage={`No public ${discipline.heading.toLowerCase()} yet — be the first to join.`}
          />
        </section>

        <section className="mt-14" aria-labelledby="other-disciplines">
          <h2 id="other-disciplines" className="mb-4 text-2xl font-semibold">
            Explore other disciplines
          </h2>
          <ul className="flex flex-wrap gap-3 list-none p-0">
            {DISCIPLINE_LANDINGS.filter((d) => d.slug !== discipline.slug).map((d) => (
              <li key={d.slug}>
                <Link to={`/${d.slug}`} className="text-sm text-primary hover:underline">
                  {d.heading}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10" aria-labelledby="by-city">
          <h2 id="by-city" className="mb-4 text-2xl font-semibold">
            Browse creatives by city
          </h2>
          <ul className="flex flex-wrap gap-3 list-none p-0">
            {CITY_LANDINGS.map((c) => (
              <li key={c.slug}>
                <Link to={`/locations/${c.slug}`} className="text-sm text-primary hover:underline">
                  Creatives in {c.city}
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

export default DisciplineLanding;
