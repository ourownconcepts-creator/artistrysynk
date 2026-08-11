import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ShieldCheck } from "lucide-react";
import { RouteSEO } from "@/components/RouteSEO";
import { VerificationChecklist } from "@/components/verification/VerificationChecklist";
import {
  CAPABILITY_LABELS,
  LEVEL_LABELS,
  fetchMyCapabilities,
  type Capability,
  type CapabilityState,
} from "@/lib/capabilities";
import { STATUS_COPY, fetchTimeline, type TimelineRow } from "@/lib/verification";

const badgeVariant = (status: string) =>
  status === "verified" ? "default" : status === "failed" ? "destructive" : "secondary";

const VerificationStatus = () => {
  const [capabilities, setCapabilities] = useState<CapabilityState[]>([]);
  const [timeline, setTimeline] = useState<TimelineRow[]>([]);
  const [selected, setSelected] = useState<Capability>("studio_create");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [caps, rows] = await Promise.all([fetchMyCapabilities(), fetchTimeline()]);
    setCapabilities(caps);
    setTimeline(rows);
    const firstBlocked = caps.find((c) => !c.allowed);
    if (firstBlocked) setSelected(firstBlocked.capability as Capability);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const level = useMemo(
    () => capabilities.find((c) => c.capability === selected)?.required_level ?? "identity_verified",
    [capabilities, selected],
  );

  const latest = timeline[0];

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <RouteSEO
        title="Verification status | ArtistrySynk"
        description="Track your ArtistrySynk verification, upload the required documents and see what happens next."
        noindex
      />

      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <ShieldCheck className="h-6 w-6 text-primary" aria-hidden="true" /> Verification
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Verify once to unlock studios, scouting, payouts and copyright tools.
        </p>
      </header>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current status</CardTitle>
              <CardDescription>
                {latest
                  ? (STATUS_COPY[latest.status]?.next ?? "We'll update you as soon as the review moves on.")
                  : "You haven't submitted a verification request yet."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {capabilities.map((c) => (
                  <Badge key={c.capability} variant={c.allowed ? "default" : "outline"}>
                    {CAPABILITY_LABELS[c.capability] ?? c.capability}: {c.allowed ? "unlocked" : "locked"}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Your level: {LEVEL_LABELS[capabilities[0]?.my_level ?? "standard"] ?? "Standard account"}
              </p>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <label htmlFor="capability" className="text-sm font-medium">
              What do you want to unlock?
            </label>
            <Select value={selected} onValueChange={(v) => setSelected(v as Capability)}>
              <SelectTrigger id="capability">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {capabilities.map((c) => (
                  <SelectItem key={c.capability} value={c.capability}>
                    {CAPABILITY_LABELS[c.capability] ?? c.capability}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <VerificationChecklist capability={selected} level={level} onSubmitted={() => void load()} />

          <Card>
            <CardHeader>
              <CardTitle>Review timeline</CardTitle>
              <CardDescription>Every update on your requests, newest first.</CardDescription>
            </CardHeader>
            <CardContent>
              {timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing here yet — submit the checklist above to start a review.
                </p>
              ) : (
                <ol className="relative space-y-5 border-l pl-5">
                  {timeline.map((row, i) => {
                    const status = row.event_status ?? row.status;
                    const copy = STATUS_COPY[status];
                    return (
                      <li key={`${row.verification_id}-${i}`} className="relative">
                        <span className="absolute -left-[26px] top-1.5 h-3 w-3 rounded-full bg-primary" />
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={badgeVariant(status)}>{copy?.label ?? status}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(row.event_at ?? row.requested_at).toLocaleString()}
                          </span>
                          {row.capability ? (
                            <span className="text-xs text-muted-foreground">
                              · {CAPABILITY_LABELS[row.capability] ?? row.capability}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {row.note ?? copy?.next ?? "Status updated."}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Need help?</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <a href="/contact">Contact support</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default VerificationStatus;