import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/app-shell/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Paperclip } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/lib/router-compat";
import { buildPageHead } from "@/lib/seoHead";
import { db, fmtDay, fmtTime, PROPOSAL_BUCKET } from "@/lib/collab";

export const Route = createFileRoute("/proposals")({
  head: () =>
    buildPageHead({
      path: "/proposals",
      title: "Proposals & bookings | ArtistrySynk",
      description: "Review collaboration proposals and booking requests you've sent and received.",
      noIndex: true,
    }),
  component: () => (
    <ProtectedRoute>
      <AppShell title="Proposals">
        <ProposalsPage />
      </AppShell>
    </ProtectedRoute>
  ),
});

interface Proposal { id: string; sender_id: string; recipient_id: string; subject: string; message: string; file_path: string | null; file_name: string | null; status: string; created_at: string }
interface Booking { id: string; requester_id: string; creative_id: string; starts_at: string; ends_at: string; note: string | null; status: string }

export function ProposalsPage({ initialTab = "received" }: { initialTab?: string } = {}) {
  const [me, setMe] = useState<string | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

  const load = useCallback(async (uid: string) => {
    const [p, b] = await Promise.all([
      db("collaboration_proposals").select("*").order("created_at", { ascending: false }).limit(100),
      db("booking_requests").select("*").order("starts_at", { ascending: false }).limit(100),
    ]);
    const ps = (p.data ?? []) as Proposal[];
    const bs = (b.data ?? []) as Booking[];
    setProposals(ps);
    setBookings(bs);
    const ids = [...new Set([...ps.flatMap((x) => [x.sender_id, x.recipient_id]), ...bs.flatMap((x) => [x.requester_id, x.creative_id])])].filter((i) => i !== uid);
    if (ids.length) {
      const { data } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      setNames(Object.fromEntries((data ?? []).map((r) => [r.id, r.full_name ?? "Member"])));
    }
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      setMe(uid);
      if (uid) void load(uid);
    });
  }, [load]);

  const setStatus = async (table: "collaboration_proposals" | "booking_requests", id: string, status: string) => {
    const { error } = await db(table).update({ status }).eq("id", id);
    if (error) return void toast.error("Couldn't update");
    toast.success(`Marked ${status}`);
    if (me) void load(me);
  };

  const openFile = async (path: string) => {
    const { data, error } = await supabase.storage.from(PROPOSAL_BUCKET).createSignedUrl(path, 300);
    if (error || !data) return void toast.error("Couldn't open file");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const person = (id: string) => <Link to={`/profile/${id}`} className="font-semibold hover:underline">{names[id] ?? "Member"}</Link>;
  const empty = (t: string) => <p className="py-8 text-center text-sm text-muted-foreground">{t}</p>;

  const proposalList = (list: Proposal[], incoming: boolean) =>
    list.length === 0 ? empty("Nothing here yet.") : (
      <ul className="space-y-3">
        {list.map((p) => (
          <li key={p.id} className="rounded-2xl border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold">{p.subject}</h3>
              <Badge variant={p.status === "accepted" ? "default" : "secondary"}>{p.status}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{incoming ? "From " : "To "}{person(incoming ? p.sender_id : p.recipient_id)} · {fmtDay(p.created_at)}</p>
            <p className="mt-3 whitespace-pre-wrap text-sm">{p.message}</p>
            {p.file_path && (
              <Button variant="outline" size="sm" className="mt-3 gap-1" onClick={() => openFile(p.file_path!)}><Paperclip className="h-3 w-3" />{p.file_name ?? "Attachment"}</Button>
            )}
            {incoming && p.status === "pending" && (
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => setStatus("collaboration_proposals", p.id, "accepted")}>Accept</Button>
                <Button size="sm" variant="outline" onClick={() => setStatus("collaboration_proposals", p.id, "declined")}>Decline</Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    );

  const bookingList = bookings.length === 0 ? empty("No booking requests yet.") : (
    <ul className="space-y-3">
      {bookings.map((b) => {
        const incoming = b.creative_id === me;
        return (
          <li key={b.id} className="rounded-2xl border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold">{fmtDay(b.starts_at)} · {fmtTime(b.starts_at)}–{fmtTime(b.ends_at)}</h3>
              <Badge variant={b.status === "accepted" ? "default" : "secondary"}>{b.status}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{incoming ? "Requested by " : "With "}{person(incoming ? b.requester_id : b.creative_id)}</p>
            {b.note && <p className="mt-2 text-sm">{b.note}</p>}
            {b.status === "pending" && (
              <div className="mt-3 flex gap-2">
                {incoming ? (
                  <>
                    <Button size="sm" onClick={() => setStatus("booking_requests", b.id, "accepted")}>Accept</Button>
                    <Button size="sm" variant="outline" onClick={() => setStatus("booking_requests", b.id, "declined")}>Decline</Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setStatus("booking_requests", b.id, "cancelled")}>Cancel request</Button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Proposals & bookings</h1>
      <Tabs defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="received">Received</TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
        </TabsList>
        <TabsContent value="received">{proposalList(proposals.filter((p) => p.recipient_id === me), true)}</TabsContent>
        <TabsContent value="sent">{proposalList(proposals.filter((p) => p.sender_id === me), false)}</TabsContent>
        <TabsContent value="bookings">{bookingList}</TabsContent>
      </Tabs>
    </main>
  );
}
