import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeExternalUrl } from "@/lib/safeLinks";
import { CthLayout, StateBox } from "@/features/competitions/CthLayout";
import { castVote, getPublicContestant, VOTE_REASON_TEXT, type PublicContestant } from "@/features/competitions/operations.service";

export const Route = createFileRoute("/creative-talent-hunt/contestants/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.slug} — Creative Talent Hunt | ArtistrySynk` },
      { name: "description", content: `See @${params.slug}'s Creative Talent Hunt entry on ArtistrySynk.` },
      { property: "og:title", content: `@${params.slug} — Creative Talent Hunt` },
      { property: "og:description", content: "Your talent deserves more than applause. It deserves an opportunity." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContestantPage,
});

function ContestantPage() {
  const { slug } = Route.useParams();
  const [c, setC] = useState<PublicContestant | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getPublicContestant(slug).then((r) => { setC(r); setState("ready"); }).catch(() => setState("error"));
  }, [slug]);

  const vote = async () => {
    if (!c?.current_round_id) return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) { toast.error("Sign in to vote."); return; }
    setBusy(true);
    try {
      const r = await castVote(c.id, c.current_round_id);
      if (r.ok) toast.success(`Vote counted. ${r.votes_remaining_today ?? 0} votes left today.`);
      else toast.error(VOTE_REASON_TEXT[r.reason ?? ""] ?? "Vote not counted.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Vote failed."); }
    finally { setBusy(false); }
  };

  if (state !== "ready" || !c) {
    return (
      <CthLayout title="Contestant">
        {state === "loading" ? <StateBox>Loading…</StateBox>
          : state === "error" ? <StateBox tone="error">Could not load this contestant.</StateBox>
          : <StateBox>This entry isn't public or doesn't exist. <Link to="/creative-talent-hunt/contestants" className="text-primary underline">Browse contestants</Link></StateBox>}
      </CthLayout>
    );
  }

  const url = sanitizeExternalUrl(c.audition_url);
  return (
    <CthLayout eyebrow={`@${c.handle} · ${c.category_name}`} title={c.display_name} intro={c.location || undefined}>
      <div className="grid gap-6 lg:grid-cols-3">
        <article className="rounded-3xl border p-6 lg:col-span-2">
          {c.bio && <p className="whitespace-pre-wrap leading-7">{c.bio}</p>}
          {c.experience && <p className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">{c.experience}</p>}
          {url && <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="mt-6 inline-flex font-semibold text-primary hover:underline">View entry →</a>}
        </article>
        <aside className="space-y-4 rounded-3xl border p-6">
          <p className="text-sm text-muted-foreground">Current round</p>
          <p className="text-lg font-bold">{c.round_name ?? "—"}</p>
          {c.voting_open ? (
            <Button onClick={() => void vote()} disabled={busy} className="w-full">Vote for {c.display_name}</Button>
          ) : (
            <p className="text-sm text-muted-foreground">Public voting isn't open right now.</p>
          )}
          <Link to="/creative-talent-hunt/categories/$slug" params={{ slug: c.category_slug }} className="block text-sm text-primary hover:underline">More in {c.category_name} →</Link>
        </aside>
      </div>
    </CthLayout>
  );
}
