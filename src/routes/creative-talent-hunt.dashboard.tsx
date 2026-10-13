import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { CthLayout, StateBox } from "@/features/competitions/CthLayout";
import { getCreativeTalentHuntApplication, type TalentHuntApplication } from "@/features/competitions/creativeTalentHunt.service";

export const Route = createFileRoute("/creative-talent-hunt/dashboard")({
  head: () => ({
    meta: [
      { title: "My Entry — Creative Talent Hunt | ArtistrySynk" },
      { name: "description", content: "Track your Creative Talent Hunt entry status and next steps." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: DashboardPage,
});

const NEXT_STEP: Record<string, string> = {
  DRAFT: "Finish your profile and audition link, then submit your entry.",
  PENDING_REVIEW: "Your entry is with our review team. We'll notify you of the decision.",
  APPROVED: "You're in! Share your contestant page so people can discover you.",
  REJECTED: "Your entry wasn't approved this time. See the reason below.",
};

function DashboardPage() {
  const navigate = useNavigate();
  const [app, setApp] = useState<TalentHuntApplication | null | undefined>(undefined);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { await navigate({ to: "/auth", search: { next: "/creative-talent-hunt/dashboard" } as never }); return; }
      try { setApp(await getCreativeTalentHuntApplication(data.session.user.id)); }
      catch (e) { setError(e instanceof Error ? e.message : "Could not load your entry."); }
    })();
  }, [navigate]);

  return (
    <CthLayout title="My entry" intro="Track your entry status and required actions.">
      {error ? <StateBox tone="error">{error}</StateBox>
        : app === undefined ? <StateBox>Loading…</StateBox>
        : app === null ? (
          <StateBox>
            You haven't started an entry yet.{" "}
            <Link to="/creative-talent-hunt/enter" className="font-semibold text-primary underline">Enter the Talent Hunt</Link>
          </StateBox>
        ) : (
          <div className="grid gap-5 lg:grid-cols-3">
            <article className="rounded-3xl border p-6 lg:col-span-2">
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">{app.status.replace("_", " ")}</span>
              <h2 className="mt-4 text-2xl font-bold">{app.display_name} <span className="font-normal text-muted-foreground">@{app.handle}</span></h2>
              <p className="mt-3 text-muted-foreground">{NEXT_STEP[app.status] ?? "We'll keep you updated."}</p>
              {app.status === "REJECTED" && app.review_reason && <p className="mt-3 rounded-2xl bg-muted/40 p-3 text-sm">{app.review_reason}</p>}
              <div className="mt-6 flex flex-wrap gap-3">
                {(app.status === "DRAFT" || app.status === "REJECTED") && (
                  <Link to="/creative-talent-hunt/enter" className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Continue entry</Link>
                )}
                {app.status === "APPROVED" && app.is_public && (
                  <Link to="/creative-talent-hunt/contestants/$slug" params={{ slug: app.handle }} className="rounded-full border px-5 py-2 text-sm font-semibold">View public page</Link>
                )}
              </div>
            </article>
            <aside className="space-y-3 rounded-3xl border p-6 text-sm">
              <p><span className="text-muted-foreground">Reference:</span> {app.reference_code ?? "Issued on submission"}</p>
              <p><span className="text-muted-foreground">Progress:</span> {app.progress_state.replace("_", " ")}</p>
              <p><span className="text-muted-foreground">Public listing:</span> {app.is_public ? "Yes" : "No"}</p>
              {app.submitted_at && <p><span className="text-muted-foreground">Submitted:</span> {new Date(app.submitted_at).toLocaleDateString()}</p>}
            </aside>
          </div>
        )}
    </CthLayout>
  );
}
