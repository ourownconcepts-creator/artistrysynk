import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CthLayout, ListCard, StateBox } from "@/features/competitions/CthLayout";
import { getCompetitionInfo, type CompetitionInfo } from "@/features/competitions/operations.service";

export const Route = createFileRoute("/creative-talent-hunt/rules")({
  head: () => ({
    meta: [
      { title: "Rules & Eligibility — Creative Talent Hunt | ArtistrySynk" },
      { name: "description", content: "Official rules, eligibility and consent requirements for the ArtistrySynk Creative Talent Hunt." },
      { property: "og:title", content: "Rules & Eligibility — Creative Talent Hunt" },
      { property: "og:description", content: "Read the rules before you enter." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RulesPage,
});

function RulesPage() {
  const [info, setInfo] = useState<CompetitionInfo | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { void getCompetitionInfo().then(setInfo).catch(() => setError(true)); }, []);
  return (
    <CthLayout title="Rules & eligibility" intro="Review the official participation requirements before submitting your entry.">
      {error ? <StateBox tone="error">Could not load the rules.</StateBox>
        : !info ? <StateBox>Loading…</StateBox>
        : (
          <div className="grid gap-5 lg:grid-cols-3">
            <ListCard title="Eligibility" items={info.config.eligibility ?? (info.config.age_min ? [`Entrants must be ${info.config.age_min} or older.`] : undefined)} empty="Not published yet." />
            <ListCard title="Rules" items={info.config.rules} empty="Not published yet." />
            <ListCard title="Consent" items={info.config.consent_requirements} empty="Not published yet." />
          </div>
        )}
    </CthLayout>
  );
}
