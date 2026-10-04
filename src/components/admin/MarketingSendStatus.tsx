import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Gauge, PauseCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useServerFn } from "@tanstack/react-start";
import { setMarketingLimit, WARMUP_STEPS } from "@/lib/marketing-admin.functions";
import { Button } from "@/components/ui/button";

const db = supabase as any;

/** Domain-wide marketing capacity, queue health and pause state. */
export const MarketingSendStatus = () => {
  const qc = useQueryClient();
  const [limitInput, setLimitInput] = useState("");
  const saveLimitFn = useServerFn(setMarketingLimit);

  const { data } = useQuery({
    queryKey: ["marketing-send-status"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data: settings } = await db
        .from("admin_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["marketing_email_limits", "marketing_send_state"]);
      const get = (k: string) => settings?.find((s: any) => s.setting_key === k)?.setting_value ?? {};
      const limits = get("marketing_email_limits");
      const state = get("marketing_send_state");
      const windowH = Number(limits.window_hours) || 24;
      const since = new Date(Date.now() - windowH * 3600_000).toISOString();
      const count = async (f: (q: any) => any) =>
        (await f(db.from("newsletter_recipients").select("id", { count: "exact", head: true }))).count ?? 0;
      const [sent24, queued, failed, bounced, skipped, unknown] = await Promise.all([
        count((q) => q.gte("accepted_at", since).neq("error_code", "legacy_sent")),
        count((q) => q.in("status", ["pending", "rate_limited", "processing", "temporarily_failed"])),
        count((q) => q.eq("status", "failed")),
        count((q) => q.eq("status", "bounced")),
        count((q) => q.in("status", ["skipped", "invalid", "unsubscribed"])),
        count((q) => q.eq("status", "unknown")),
      ]);
      const { data: next } = await db
        .from("scheduled_newsletters")
        .select("next_attempt_at")
        .in("status", ["paused", "pending"])
        .not("next_attempt_at", "is", null)
        .order("next_attempt_at")
        .limit(1)
        .maybeSingle();
      return {
        limit: Number(limits.daily_limit) || 0,
        sent24, queued, failed, bounced, skipped, unknown,
        pausedUntil: state.paused_until && new Date(state.paused_until) > new Date() ? state.paused_until : null,
        reason: state.reason as string | undefined,
        nextAt: next?.next_attempt_at ?? null,
      };
    },
  });

  const saveLimit = async () => {
    const n = Number(limitInput);
    if (!n) return;
    if (!window.confirm(`Only continue if QueenSMTP has actually raised your marketing allowance to ${n} per 24 hours. Continue?`)) return;
    try {
      await saveLimitFn({ data: { dailyLimit: n } });
      toast.success(`Marketing limit set to ${n} per 24 hours`);
      setLimitInput("");
      qc.invalidateQueries({ queryKey: ["marketing-send-status"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not change the limit");
    }
  };

  if (!data) return null;
  const remaining = Math.max(0, data.limit - data.sent24);
  const Stat = ({ label, value }: { label: string; value: number | string }) => (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold text-foreground">{value}</p>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Gauge className="w-5 h-5" /> Marketing sending capacity</CardTitle>
        <CardDescription>Newsletters only. Account emails (sign-up, password reset, bookings) use a separate allowance.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.pausedUntil && (
          <div className="flex items-start gap-3 rounded-lg border border-primary/40 bg-primary/10 p-3">
            <PauseCircle className="w-5 h-5 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Warm-up limit reached. Campaign paused. Sending will resume automatically.</p>
              <p className="text-muted-foreground">Resumes after {format(new Date(data.pausedUntil), "PPP 'at' p")}.</p>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Daily limit (24h)" value={data.limit} />
          <Stat label="Sent last 24h" value={data.sent24} />
          <Stat label="Remaining (est.)" value={remaining} />
          <Stat label="Queued / pending" value={data.queued} />
          <Stat label="Failed" value={data.failed} />
          <Stat label="Bounced" value={data.bounced} />
          <Stat label="Skipped / invalid / unsub." value={data.skipped} />
          <Stat label="Next send" value={data.nextAt ? format(new Date(data.nextAt), "MMM d, p") : "—"} />
        </div>
        <div className="space-y-2 rounded-lg border p-3">
          <p className="font-medium text-foreground">QueenSMTP marketing warm-up limit</p>
          <p className="text-xs text-muted-foreground">
            Rolling 24-hour allowance (not a midnight reset). Only raise it after QueenSMTP has actually raised your domain's
            marketing allowance. It can go up one warm-up step at a time.
          </p>
          <div className="flex gap-2 items-center">
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
              value={limitInput}
              onChange={(e) => setLimitInput(e.target.value)}
            >
              <option value="">Current: {data.limit}</option>
              {WARMUP_STEPS.filter((s) => s <= nextStep(data.limit) && s !== data.limit).map((s) => (
                <option key={s} value={s}>{s} per 24h</option>
              ))}
            </select>
            <Button variant="outline" onClick={saveLimit} disabled={!limitInput}>Update limit</Button>
          </div>
        </div>
        {data.unknown > 0 && (
          <p className="text-sm text-destructive">
            {data.unknown} send(s) have an unknown result (connection lost after the request). They are never resent automatically —
            check the QueenSMTP message log, then settle them on the campaign below.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

const nextStep = (cur: number) => {
  const i = (WARMUP_STEPS as readonly number[]).indexOf(cur);
  return i >= 0 && i < WARMUP_STEPS.length - 1 ? WARMUP_STEPS[i + 1] : cur;
};
