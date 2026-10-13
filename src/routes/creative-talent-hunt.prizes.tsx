import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CthLayout, ListCard, StateBox } from "@/features/competitions/CthLayout";
import { getCompetitionInfo, type CompetitionInfo } from "@/features/competitions/operations.service";

export const Route = createFileRoute("/creative-talent-hunt/prizes")({
  head: () => ({
    meta: [
      { title: "Prizes — Creative Talent Hunt | ArtistrySynk" },
      { name: "description", content: "Prizes and opportunities for ArtistrySynk Creative Talent Hunt winners." },
      { property: "og:title", content: "Prizes — Creative Talent Hunt" },
      { property: "og:description", content: "Your talent deserves more than applause. It deserves an opportunity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrizesPage,
});

function PrizesPage() {
  const [info, setInfo] = useState<CompetitionInfo | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { void getCompetitionInfo().then(setInfo).catch(() => setError(true)); }, []);
  return (
    <CthLayout title="Prizes & opportunities" intro="Your talent deserves more than applause. It deserves an opportunity.">
      {error ? <StateBox tone="error">Could not load prizes.</StateBox>
        : !info ? <StateBox>Loading…</StateBox>
        : <ListCard title="What winners receive" items={info.config.prizes} empty="Prizes will be announced soon." />}
    </CthLayout>
  );
}
