import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { castCreativeTalentHuntVote } from "@/features/competitions/creativeTalentHunt.service";
import { useSession } from "@/hooks/useSession";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/creative-talent-hunt/contestants/$handle")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.handle} — ArtistrySynk Creative Talent Hunt` },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: ContestantProfilePage,
});

function ContestantProfilePage() {
  const { handle } = Route.useParams();
  const { user } = useSession();
  const profile = useQuery({
    queryKey: ["creative-talent-hunt-profile", handle],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_creative_talent_hunt_entry", {
        p_handle: handle,
      });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  if (profile.isLoading) return <main className="mx-auto max-w-3xl px-6 py-20 text-muted-foreground">Loading creator…</main>;

  const round = useQuery({
    queryKey: ["creative-talent-hunt-voting-round"],
    queryFn: async () => {
      const { data: competition, error: competitionError } = await supabase
        .from("competition_competitions").select("id,status").eq("slug","creative-talent-hunt").single();
      if (competitionError) throw competitionError;
      const { data, error } = await supabase.from("competition_rounds")
        .select("id,status,public_voting_enabled").eq("competition_id", competition.id)
        .eq("public_voting_enabled", true).order("sequence",{ascending:false}).limit(1);
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  const voteMutation = useMutation({ mutationFn: () => castCreativeTalentHuntVote(profile.data?.id ?? ""), onSuccess: () => { toast.success("Your vote has been recorded."); void round.refetch(); }, onError: (e) => toast.error(e instanceof Error ? e.message : "Could not record your vote.") });

  if (!profile.data) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="text-3xl font-bold">Creator not found</h1>
        <p className="mt-3 text-muted-foreground">This public Talent Hunt profile may not be available.</p>
        <Button asChild className="mt-6"><Link to="/creative-talent-hunt/contestants">Explore contestants</Link></Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-14 sm:py-20">
      <Link to="/creative-talent-hunt/contestants" className="text-sm text-muted-foreground hover:text-foreground">← All contestants</Link>
      <div className="mt-10 rounded-3xl border p-7 sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">{profile.data.category_name}</p>
        <h1 className="mt-3 text-4xl font-bold">{profile.data.display_name}</h1>
        <p className="mt-1 text-muted-foreground">@{profile.data.handle}{profile.data.location ? ` · ${profile.data.location}` : ""}</p>
        {profile.data.bio && <p className="mt-7 text-lg leading-8">{profile.data.bio}</p>}
        {profile.data.experience && (
          <section className="mt-8 border-t pt-7">
            <h2 className="font-semibold">Creative journey</h2>
            <p className="mt-3 leading-7 text-muted-foreground">{profile.data.experience}</p>
          </section>
        )}
        <div className="mt-8 flex flex-wrap gap-3">
          <Button disabled={!user || voteMutation.isPending || round.isLoading || !round.data || round.data.status !== "VOTING_OPEN" || !round.data.public_voting_enabled} onClick={() => voteMutation.mutate()}>{voteMutation.isPending ? "Voting…" : !user ? "Sign in to vote" : !round.data ? "Voting unavailable" : round.data.status === "VOTING_OPEN" ? "Vote for this creator" : "Voting closed"}</Button>
          {profile.data.audition_url && <Button asChild><a href={profile.data.audition_url} target="_blank" rel="noreferrer">View their work</a></Button>}
          <Button asChild variant="outline"><Link to="/creative-talent-hunt/enter">Enter the Hunt</Link></Button>
        </div>
      </div>
    </main>
  );
}
