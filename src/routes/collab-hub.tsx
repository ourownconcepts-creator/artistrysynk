import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Footer } from "@/components/Footer";
import { Link } from "@/lib/router-compat";
import { buildPageHead } from "@/lib/seoHead";
import { db, fmtDay, fmtTime, type Slot } from "@/lib/collab";
import { CITY_LANDINGS } from "@/lib/seoLandings";

export const Route = createFileRoute("/collab-hub")({
  head: () =>
    buildPageHead({
      path: "/collab-hub",
      title: "Collaboration Hub — Creative Services, Rates & Availability | ArtistrySynk",
      description:
        "Find creatives offering services with clear rates and open dates. Compare producers, photographers, designers and more, then book or send a proposal.",
      keywords: "hire creatives online, creative services rates, book a music producer, collaborate with musicians online",
    }),
  component: CollabHub,
});

interface Service { id: string; seller_id: string; title: string; description: string | null; category: string; price: number; currency: string; delivery_days: number | null }

interface Proj { id: string; title: string; description: string | null; created_by: string }

function CollabHub() {
  const [projects, setProjects] = useState<Proj[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [slots, setSlots] = useState<Record<string, Slot[]>>({});
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      setMe(uid);
      const { data } = await supabase
        .from("services")
        .select("id, seller_id, title, description, category, price, currency, delivery_days")
        .eq("is_active", true)
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(60);
      const { data: pj } = await supabase
        .from("projects")
        .select("id, title, description, created_by")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(30);
      setProjects((pj ?? []) as Proj[]);
      const list = (data ?? []) as Service[];
      setServices(list);
      const sellers = [...new Set(list.map((s) => s.seller_id))];
      if (sellers.length) {
        const { data: ps } = await supabase.from("profiles").select("id, full_name").in("id", sellers);
        setNames(Object.fromEntries((ps ?? []).map((p) => [p.id, p.full_name ?? "Creative"])));
        if (uid) {
          const { data: sl } = await db("availability_slots")
            .select("*")
            .in("user_id", sellers)
            .gte("starts_at", new Date().toISOString())
            .order("starts_at")
            .limit(300);
          const grouped: Record<string, Slot[]> = {};
          for (const s of (sl ?? []) as Slot[]) (grouped[s.user_id] ??= []).push(s);
          setSlots(grouped);
        }
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return services.filter((s) => !n || `${s.title} ${s.category} ${names[s.seller_id] ?? ""}`.toLowerCase().includes(n));
  }, [q, services, names]);

  const needle = q.trim().toLowerCase();
  const projHits = projects.filter((p) => !needle || `${p.title} ${p.description ?? ""}`.toLowerCase().includes(needle));
  const cityHits = CITY_LANDINGS.filter((c) => !needle || `${c.city} ${c.country}`.toLowerCase().includes(needle));

  const money = (s: Service) => {
    try { return new Intl.NumberFormat("en-GB", { style: "currency", currency: s.currency || "NGN" }).format(s.price); }
    catch { return `${s.currency} ${s.price}`; }
  };

  return (
    <div className="min-h-screen">
      <main className="container mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-4xl font-bold tracking-tight">Collaboration Hub</h1>
        <p className="mt-3 max-w-3xl text-lg text-muted-foreground">
          Services, rates, open dates, open projects and local creatives by city — the marketplace, city pages and
          project board in one place. One search covers everything below.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Input className="max-w-sm" placeholder="Search services, creatives, projects or cities" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button asChild><Link to={me ? "/marketplace" : "/auth"}>{me ? "List your service" : "Sign in to list a service"}</Link></Button>
          {me && <Button asChild variant="outline"><Link to="/creator-dashboard">Set your availability</Link></Button>}
        </div>

        <h2 className="mt-10 text-2xl font-semibold">Services &amp; rates</h2>
        {loading ? (
          <p className="mt-10 text-muted-foreground">Loading services…</p>
        ) : filtered.length === 0 ? (
          <p className="mt-10 text-muted-foreground">No services match yet. Be the first to list one.</p>
        ) : (
          <ul className="mt-8 grid list-none gap-4 p-0 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => {
              const open = slots[s.seller_id] ?? [];
              return (
                <li key={s.id} className="flex flex-col rounded-xl border p-5">
                  <Badge variant="secondary" className="self-start">{s.category}</Badge>
                  <h2 className="mt-3 text-lg font-semibold">{s.title}</h2>
                  <Link to={`/profile/${s.seller_id}`} className="text-sm text-primary hover:underline">
                    {names[s.seller_id] ?? "Creative"}
                  </Link>
                  {s.description && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{s.description}</p>}
                  <p className="mt-3 text-xl font-bold">{money(s)}</p>
                  {s.delivery_days ? <p className="text-xs text-muted-foreground">Delivery in {s.delivery_days} days</p> : null}
                  <div className="mt-3 text-sm">
                    <p className="font-medium">Next open dates</p>
                    {!me ? (
                      <p className="text-muted-foreground">Sign in to see availability.</p>
                    ) : open.length ? (
                      <ul className="mt-1 space-y-0.5 text-muted-foreground">
                        {open.slice(0, 3).map((o) => (
                          <li key={o.id}>{fmtDay(o.starts_at)} · {fmtTime(o.starts_at)}–{fmtTime(o.ends_at)}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">No open dates listed.</p>
                    )}
                  </div>
                  <div className="mt-auto flex gap-2 pt-4">
                    <Button asChild size="sm"><Link to={`/profile/${s.seller_id}`}>Book</Link></Button>
                    <Button asChild size="sm" variant="outline"><Link to={`/propose/${s.seller_id}`}>Send proposal</Link></Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <section className="mt-14">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-2xl font-semibold">Open projects</h2>
            <Link to="/open-projects" className="text-sm text-primary hover:underline">All open projects →</Link>
          </div>
          {loading ? null : projHits.length === 0 ? (
            <p className="mt-4 text-muted-foreground">No open projects match.</p>
          ) : (
            <ul className="mt-4 grid list-none gap-4 p-0 md:grid-cols-2 lg:grid-cols-3">
              {projHits.slice(0, 9).map((p) => (
                <li key={p.id} className="flex flex-col rounded-xl border p-5">
                  <h3 className="font-semibold">{p.title}</h3>
                  {p.description && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{p.description}</p>}
                  <div className="mt-auto pt-4">
                    <Button asChild size="sm" variant="outline"><Link to={me ? "/open-projects" : "/auth"}>{me ? "Apply" : "Sign in to apply"}</Link></Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-14">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-2xl font-semibold">Find creatives by city</h2>
            <Link to="/locations" className="text-sm text-primary hover:underline">City directory →</Link>
          </div>
          {cityHits.length === 0 ? (
            <p className="mt-4 text-muted-foreground">No city pages match.</p>
          ) : (
            <ul className="mt-4 flex list-none flex-wrap gap-2 p-0">
              {cityHits.map((c) => (
                <li key={c.slug}>
                  <Link to={`/locations/${c.slug}`} className="inline-block rounded-full border px-3 py-1 text-sm hover:border-primary">
                    {c.city}, {c.country}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
