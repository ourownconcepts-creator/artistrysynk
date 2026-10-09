import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import {
  listCreativeTalentHuntReviewQueue,
  getTalentHuntAdminEntryDetail,
  reviewCreativeTalentHuntApplication,
  reviewCreativeTalentHuntSubmission,
  type TalentHuntApplication,
} from "@/features/competitions/creativeTalentHunt.service";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/creative-talent-hunt")({
  head: () => ({
    meta: [
      { title: "Creative Talent Hunt Review — ArtistrySynk" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: CreativeTalentHuntReviewPage,
});

function CreativeTalentHuntReviewPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [entries, setEntries] = useState<TalentHuntApplication[]>([]);
  const [workingId, setWorkingId] = useState("");
  const [publishSubmission, setPublishSubmission] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);

  const loadQueue = async () => {
    const data = await listCreativeTalentHuntReviewQueue();
    setEntries(data);
  };

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) return;

        await loadQueue();
        setAllowed(true);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load the review queue.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openDetail = async (id: string) => {
    setDetailId(id);
    try { setDetail(await getTalentHuntAdminEntryDetail(id)); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not load entry detail."); }
  };

  const decide = async (entry: TalentHuntApplication, decision: "APPROVE" | "REJECT" | "CORRECTION_REQUESTED" | "UNDER_REVIEW") => {
    const reason =
      decision === "REJECT" || decision === "CORRECTION_REQUESTED"
        ? window.prompt("Reason for rejecting this entry:", entry.review_reason || "") || ""
        : "";

    if ((decision === "REJECT" || decision === "CORRECTION_REQUESTED") && !reason.trim()) {
      toast.error("Add a reason before rejecting an entry.");
      return;
    }

    setWorkingId(entry.id);
    try {
      if (decision === "APPROVE") {
        await reviewCreativeTalentHuntSubmission(
          entry.id,
          "APPROVED",
          "",
          publishSubmission,
        );
      } else if (decision === "REJECT") {
        await reviewCreativeTalentHuntSubmission(entry.id, "REJECTED", reason.trim());
      } else if (decision === "CORRECTION_REQUESTED") {
        await reviewCreativeTalentHuntSubmission(
          entry.id,
          "REVISION_REQUESTED",
          reason.trim(),
        );
      } else {
        await reviewCreativeTalentHuntApplication(entry.id, decision, reason.trim());
      }
      setEntries((current) => current.filter((item) => item.id !== entry.id));
      toast.success(decision === "APPROVE" ? "Entry approved." : decision === "REJECT" ? "Entry rejected." : decision === "CORRECTION_REQUESTED" ? "Correction requested." : "Entry moved to review.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update this entry.");
    } finally {
      setWorkingId("");
    }
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-background text-foreground">
        <section className="border-b">
          <div className="mx-auto max-w-7xl px-6 py-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
                  Competition Operations
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight">
                  Creative Talent Hunt Review
                </h1>
              </div>
              <Link
                to="/creative-talent-hunt"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                View public Hunt →
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-12">
          {loading ? (
            <div className="rounded-3xl border p-8 text-muted-foreground">
              Loading review queue…
            </div>
          ) : !allowed ? (
            <div className="rounded-3xl border p-8">
              <h2 className="text-xl font-bold">Access restricted</h2>
              <p className="mt-2 text-muted-foreground">
                This workspace is available only to ArtistrySynk competition administrators.
              </p>
            </div>
          ) : detailId && detail ? (
            <div className="mb-6 rounded-3xl border bg-muted/20 p-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-bold">Full entry inspection</h2>
                <Button variant="ghost" onClick={() => { setDetailId(null); setDetail(null); }}>Close</Button>
              </div>
              <pre className="mt-4 max-h-[32rem] overflow-auto rounded-2xl bg-background p-4 text-xs">{JSON.stringify(detail, null, 2)}</pre>
            </div>
          ) : entries.length === 0 ? (
            <div className="rounded-3xl border p-8">
              <h2 className="text-xl font-bold">Review queue is clear.</h2>
              <p className="mt-2 text-muted-foreground">
                New submitted Talent Hunt entries will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-2xl bg-muted/50 px-5 py-4 text-sm">
                <strong>{entries.length}</strong> entries awaiting review.
              </div>

              {entries.map((entry) => (
                <article key={entry.id} className="rounded-3xl border p-6 sm:p-8">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                          {entry.status}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground">
                          {entry.reference_code || "No reference"}
                        </span>
                      </div>
                      <h2 className="mt-3 text-2xl font-bold">
                        {entry.display_name} <span className="font-normal text-muted-foreground">(@{entry.handle})</span>
                      </h2>
                      {entry.location && (
                        <p className="mt-2 text-sm text-muted-foreground">{entry.location}</p>
                      )}
                      {entry.bio && (
                        <p className="mt-5 max-w-3xl whitespace-pre-wrap text-sm leading-7">
                          {entry.bio}
                        </p>
                      )}
                      {entry.experience && (
                        <div className="mt-5">
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Experience
                          </p>
                          <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-7">
                            {entry.experience}
                          </p>
                        </div>
                      )}
                      {entry.audition_url && (
                        <a
                          href={entry.audition_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-5 inline-flex text-sm font-semibold text-primary hover:underline"
                        >
                          Open audition / portfolio →
                        </a>
                      )}
                      {entry.audition_notes && (
                        <div className="mt-5 rounded-2xl bg-muted/40 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Creator notes
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                            {entry.audition_notes}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-3">
                      <label className="flex max-w-52 items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={publishSubmission}
                          onChange={(event) => setPublishSubmission(event.target.checked)}
                          disabled={workingId === entry.id}
                        />
                        Publish approved work publicly
                      </label>
                      <Button variant="outline" onClick={() => void openDetail(entry.id)} disabled={workingId === entry.id}>
                        View full entry
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => void decide(entry, "UNDER_REVIEW")}
                        disabled={workingId === entry.id}
                      >
                        Review
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => void decide(entry, "CORRECTION_REQUESTED")}
                        disabled={workingId === entry.id}
                      >
                        Request correction
                      </Button>
                      <Button
                        onClick={() => void decide(entry, "APPROVE")}
                        disabled={workingId === entry.id}
                      >
                        {workingId === entry.id ? "Working…" : "Approve"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => void decide(entry, "REJECT")}
                        disabled={workingId === entry.id}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </PageTransition>
  );
}
