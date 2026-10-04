import { useEffect, useState } from "react";
import { Link, useLocation } from "@/lib/router-compat";
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
      .rpc("list_public_profiles", { _role: discipline.role, _city: undefined, _limit: 48, _offset: 0 })
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

        <section className="mt-10 grid gap-8 md:grid-cols-3" aria-labelledby="hire-heading">
          <h2 id="hire-heading" className="sr-only">
            How to work with {discipline.heading.toLowerCase()} on ArtistrySynk
          </h2>
          <div>
            <h3 className="text-xl font-semibold">1. Review real work</h3>
            <p className="mt-2 text-muted-foreground">
              Every profile shows a portfolio, roles, genres and verified credits from finished
              projects, so you can judge {discipline.heading.toLowerCase()} on what they have
              actually shipped rather than on a CV.
            </p>
          </div>
          <div>
            <h3 className="text-xl font-semibold">2. Match before you message</h3>
            <p className="mt-2 text-muted-foreground">
              Swipe through creatives in <Link to="/discover" className="text-primary hover:underline">Discover</Link>.
              Chat opens only after a mutual match, which keeps inboxes free of cold pitches and
              makes every conversation intentional.
            </p>
          </div>
          <div>
            <h3 className="text-xl font-semibold">3. Build it together</h3>
            <p className="mt-2 text-muted-foreground">
              Send a collaboration request, open a private project room for files and feedback,
              and earn credits that strengthen both profiles once the work is done.
            </p>
          </div>
        </section>

        <section className="mt-10 max-w-3xl" aria-labelledby="tips-heading">
          <h2 id="tips-heading" className="text-2xl font-semibold">
            What to look for in {discipline.heading.toLowerCase()}
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
            <li>Recent portfolio pieces close to the style or genre of your project.</li>
            <li>Credits from completed collaborations and reviews from past partners.</li>
            <li>Clear availability, location or remote preference, and response habits.</li>
            <li>A synergy score that reflects how well your roles and genres fit.</li>
          </ul>
          <p className="mt-4 text-muted-foreground">
            New here? Read <Link to="/how-it-works" className="text-primary hover:underline">how ArtistrySynk works</Link>,
            compare <Link to="/pricing" className="text-primary hover:underline">plans</Link>, see{" "}
            <Link to="/success-stories" className="text-primary hover:underline">success stories</Link>, or browse
            collaboration tips on the <Link to="/blog" className="text-primary hover:underline">blog</Link>.
          </p>
        </section>

        <section className="mt-10 grid max-w-5xl gap-8 md:grid-cols-2" aria-labelledby="online-heading">
          <div>
            <h2 id="online-heading" className="text-2xl font-semibold">
              Collaborate with musicians and {discipline.heading.toLowerCase()} online
            </h2>
            <p className="mt-3 text-muted-foreground">
              Remote collaboration is how most creative work gets made today. On ArtistrySynk you
              can share stems, briefs, mood boards and drafts inside a private project room, agree
              rates up front, and keep every file and decision in one place, whether your partner
              is across town or on another continent.
            </p>
            <p className="mt-3 text-muted-foreground">
              Browse ready-made offers and prices in the{" "}
              <Link to="/marketplace" className="text-primary hover:underline">services marketplace</Link>, or post
              a brief on <Link to="/open-projects" className="text-primary hover:underline">open projects</Link> and
              let the right people apply to you.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold">Find creatives near me</h2>
            <p className="mt-3 text-muted-foreground">
              Some sessions work best in person: a studio day, a photo shoot or a live rehearsal.
              Turn on location in Discover to see {discipline.heading.toLowerCase()} and other
              creatives sorted by distance, or open a city page below to find local talent, studios
              and collaborators near you.
            </p>
            <p className="mt-3 text-muted-foreground">
              Every profile shows an availability calendar, so you can request a booking on a free
              day instead of chasing replies.
            </p>
          </div>
        </section>

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
