import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { getPendingLegalAcceptances, recordConsents } from "@/lib/legal.functions";
import { flushPendingConsents } from "@/lib/consent";
import { Button } from "@/components/ui/button";
import { ScrollText, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Pending = { slug: string; title: string; version: number; effectiveDate: string };

/**
 * Asks signed-in users to review and accept updated mandatory policies.
 * Only appears when a newer published version exists than the one they accepted,
 * so unchanged documents are never re-prompted.
 */
export const LegalAcceptanceGate = () => {
  const loadPending = useServerFn(getPendingLegalAcceptances);
  const saveConsents = useServerFn(recordConsents);
  const [pending, setPending] = useState<Pending[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setPending([]);
        return;
      }
      await flushPendingConsents();
      const rows = (await loadPending()) as Pending[];
      setPending(rows);
    } catch {
      setPending([]);
    }
  }, [loadPending]);

  useEffect(() => {
    void refresh();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED") void refresh();
      if (event === "SIGNED_OUT") setPending([]);
    });
    return () => data.subscription.unsubscribe();
  }, [refresh]);

  if (pending.length === 0) return null;

  const accept = async () => {
    setBusy(true);
    try {
      await saveConsents({
        data: {
          context: "policy_update",
          entries: pending.map((p) => ({
            consentType: "legal_acceptance" as const,
            documentSlug: p.slug,
            granted: true,
          })),
        },
      });
      setPending([]);
      toast.success("Thanks — your acceptance has been recorded.");
    } catch {
      toast.error("Could not record your acceptance. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="region"
      aria-label="Updated policies"
      className="fixed bottom-0 left-0 right-0 z-40 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
    >
      <div className="container mx-auto max-w-3xl rounded-xl border border-border bg-card/95 backdrop-blur-sm p-4 shadow-xl">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <ScrollText className="w-6 h-6 text-primary shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0 text-sm">
            <p className="font-medium">We've updated our policies</p>
            <p className="text-muted-foreground">
              Please review the updated{" "}
              {pending.map((p, i) => (
                <span key={p.slug}>
                  {i > 0 && (i === pending.length - 1 ? " and " : ", ")}
                  <Link to={`/legal/${p.slug}`} className="text-primary hover:underline">
                    {p.title}
                  </Link>
                </span>
              ))}
              .
            </p>
          </div>
          <Button onClick={accept} disabled={busy} className="gap-2 min-h-11 shrink-0">
            {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            {busy ? "Saving…" : "I've reviewed and accept"}
          </Button>
        </div>
      </div>
    </div>
  );
};
