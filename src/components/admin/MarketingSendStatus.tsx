import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Gauge, PauseCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const db = supabase as any;

/** Domain-wide marketing capacity, queue health and pause state. */
export const MarketingSendStatus = () => {
  const qc = useQueryClient();
  const [limitInput, setLimitInput] = useState("");

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
      const [sent24, queued, failed, bounced, skipped] = await Promise.all([
        count((q) => q.gte("accepted_at", since).neq("error_code", "legacy_sent")),
        count((q) => q.in("status", ["pending", "rate_limited", "processing"])),
        count((q) => q.eq("status", "failed")),
        count((q) => q.eq("status", "bounced")),
        count((q) => q.in("status", ["skipped", "invalid", "unsubscribed"])),
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
        sent24, queued, failed, bounced, skipped,
        pausedUntil: state.paused_until && new Date(state.paused_until) > new Date() ? state.paused_until : null,
        reason: state.reason as string | undefined,
        nextAt: next?.next_attempt_at ?? null,
      };
    },
  });

  const saveLimit = async () => {
    const n = Number(limitInput);
    if (!Number.isInteger(n) || n < 1) return void toast.error("Enter a whole number above 0");
    const { error } = await db
      .from("admin_settings")
      .upsert({ setting_key: "marketing_email_limits", setting_value: { daily_limit: n, window_hours: 24 } }, { onConflict: "setting_key" });
    if (error) return toast.error("Only super admins can change the limit");
    toast.success(`Marketing limit set to ${n} per 24 hours`);
    setLimitInput("");
    qc.invalidateQueries({ queryKey: ["marketing-send-status"] });
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
        <div className="flex gap-2 items-center">
          <Input className="max-w-[160px]" type="number" min={1} placeholder={`Limit (${data.limit})`} value={limitInput} onChange={(e) => setLimitInput(e.target.value)} />
          <Button variant="outline" onClick={saveLimit}>Update limit</Button>
          <span className="text-xs text-muted-foreground">Raise this when QueenSMTP raises your warm-up step (30 → 60 → 150 → 300…).</span>
        </div>
      </CardContent>
    </Card>
  );
};
