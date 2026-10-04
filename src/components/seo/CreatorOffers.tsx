import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@/lib/router-compat";
import { Button } from "@/components/ui/button";
import { db, fmtDay, fmtTime, type Slot } from "@/lib/collab";

interface Service { id: string; seller_id: string; title: string; price: number; currency: string }

/** Services, rates and next open dates for a set of creators (dates only for signed-in members). */
export function CreatorOffers({ creators }: { creators: { id: string; full_name: string }[] }) {
  const [services, setServices] = useState<Service[]>([]);
  const [slots, setSlots] = useState<Record<string, Slot[]>>({});
  const [signedIn, setSignedIn] = useState(false);
  const key = creators.map((c) => c.id).join(",");

  useEffect(() => {
    const ids = key ? key.split(",") : [];
    if (!ids.length) { setServices([]); setSlots({}); return; }
    let active = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { data } = await supabase
        .from("services")
        .select("id, seller_id, title, price, currency")
        .in("seller_id", ids)
        .eq("is_active", true)
        .eq("is_hidden", false)
        .limit(200);
      let grouped: Record<string, Slot[]> = {};
      if (auth.user) {
        const { data: sl } = await db("availability_slots")
          .select("*").in("user_id", ids).gte("starts_at", new Date().toISOString()).order("starts_at").limit(300);
        for (const s of (sl ?? []) as Slot[]) (grouped[s.user_id] ??= []).push(s);
      } else grouped = {};
      if (!active) return;
      setSignedIn(!!auth.user);
      setServices((data ?? []) as Service[]);
      setSlots(grouped);
    })();
    return () => { active = false; };
  }, [key]);

  const withOffers = creators.filter((c) => services.some((s) => s.seller_id === c.id) || slots[c.id]?.length);
  if (!withOffers.length) return null;

  const money = (s: Service) => {
    try { return new Intl.NumberFormat("en-GB", { style: "currency", currency: s.currency || "NGN" }).format(s.price); }
    catch { return `${s.currency} ${s.price}`; }
  };

  return (
    <ul className="grid list-none gap-4 p-0 md:grid-cols-2">
      {withOffers.map((c) => (
        <li key={c.id} className="rounded-xl border p-4">
          <Link to={`/profile/${c.id}`} className="font-semibold hover:text-primary">{c.full_name}</Link>
          <ul className="mt-2 space-y-1 text-sm">
            {services.filter((s) => s.seller_id === c.id).slice(0, 4).map((s) => (
              <li key={s.id} className="flex justify-between gap-3"><span>{s.title}</span><span className="font-semibold">{money(s)}</span></li>
            ))}
          </ul>
          <p className="mt-3 text-sm font-medium">Next open dates</p>
          {!signedIn ? (
            <p className="text-sm text-muted-foreground"><Link to="/auth" className="text-primary hover:underline">Sign in</Link> to see availability.</p>
          ) : slots[c.id]?.length ? (
            <ul className="text-sm text-muted-foreground">
              {slots[c.id].slice(0, 3).map((o) => <li key={o.id}>{fmtDay(o.starts_at)} · {fmtTime(o.starts_at)}–{fmtTime(o.ends_at)}</li>)}
            </ul>
          ) : <p className="text-sm text-muted-foreground">No open dates listed.</p>}
          <div className="mt-3 flex gap-2">
            <Button asChild size="sm"><Link to={`/profile/${c.id}`}>Book</Link></Button>
            <Button asChild size="sm" variant="outline"><Link to={`/propose/${c.id}`}>Send proposal</Link></Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
