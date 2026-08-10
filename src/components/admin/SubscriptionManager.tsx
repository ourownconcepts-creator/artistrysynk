import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { CreditCard, Crown, Users, TrendingUp, Loader2, Infinity as InfinityIcon, ShieldAlert } from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Subscription {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  tier: "free" | "pro" | "studio";
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  is_lifetime: boolean;
  created_at: string;
}

/** Selectable grant lengths. `months: null` means lifetime (never expires). */
const DURATIONS: { value: string; label: string; months: number | null }[] = [
  { value: "1w", label: "1 week", months: 0.25 },
  { value: "1m", label: "1 month", months: 1 },
  { value: "3m", label: "3 months", months: 3 },
  { value: "6m", label: "6 months", months: 6 },
  { value: "9m", label: "9 months", months: 9 },
  { value: "12m", label: "1 year", months: 12 },
  { value: "24m", label: "2 years", months: 24 },
  { value: "60m", label: "5 years", months: 60 },
  { value: "life", label: "Lifetime", months: null },
];

const endDateFor = (value: string): string | null => {
  const found = DURATIONS.find((d) => d.value === value);
  if (!found || found.months === null) return null;
  const end = new Date();
  if (found.months < 1) end.setDate(end.getDate() + Math.round(found.months * 30));
  else end.setMonth(end.getMonth() + found.months);
  return end.toISOString();
};

interface SubscriptionStats {
  total: number;
  free: number;
  pro: number;
  studio: number;
  active: number;
}

export const SubscriptionManager = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<SubscriptionStats>({ total: 0, free: 0, pro: 0, studio: 0, active: 0 });
  const [loading, setLoading] = useState(true);
  const [filterTier, setFilterTier] = useState<string>("all");
  const [savingIds, setSavingIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [duration, setDuration] = useState<string>("1m");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    fetchSubscriptions();
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", auth.user.id);
      setIsSuperAdmin((roles ?? []).some((r) => r.role === "super_admin" || r.role === "master_admin"));
    })();
  }, []);

  const fetchSubscriptions = async () => {
    setLoading(true);
    
    const { data: subsData, error } = await supabase
      .from("user_subscriptions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch subscriptions");
      setLoading(false);
      return;
    }

    // Get user profiles
    const userIds = subsData?.map(s => s.user_id) || [];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    const { data: emails } = await supabase.rpc("get_profile_emails", { _user_ids: userIds });
    const emailMap = new Map((emails || []).map((e: any) => [e.id, e.email]));

    const profileMap = new Map(profiles?.map(p => [p.id, { name: p.full_name, email: emailMap.get(p.id) || "" }]) || []);

    const enrichedSubs = subsData?.map(sub => ({
      ...sub,
      user_name: profileMap.get(sub.user_id)?.name || "Unknown",
      user_email: profileMap.get(sub.user_id)?.email || "",
    })) || [];

    // Calculate stats
    const newStats: SubscriptionStats = {
      total: enrichedSubs.length,
      free: enrichedSubs.filter(s => s.tier === "free").length,
      pro: enrichedSubs.filter(s => s.tier === "pro").length,
      studio: enrichedSubs.filter(s => s.tier === "studio").length,
      active: enrichedSubs.filter(s => s.status === "active").length,
    };

    setStats(newStats);
    setSubscriptions(enrichedSubs as Subscription[]);
    setLoading(false);
  };

  /** Stats are derived locally so a single row edit never needs a full refetch. */
  const recomputeStats = (rows: Subscription[]): SubscriptionStats => ({
    total: rows.length,
    free: rows.filter((s) => s.tier === "free").length,
    pro: rows.filter((s) => s.tier === "pro").length,
    studio: rows.filter((s) => s.tier === "studio").length,
    active: rows.filter((s) => s.status === "active").length,
  });

  const applyLocal = (ids: string[], patch: Partial<Subscription>) => {
    setSubscriptions((prev) => {
      const next = prev.map((s) => (ids.includes(s.id) ? { ...s, ...patch } : s));
      setStats(recomputeStats(next));
      return next;
    });
  };

  const markSaving = (ids: string[], on: boolean) =>
    setSavingIds((prev) => (on ? [...prev, ...ids] : prev.filter((id) => !ids.includes(id))));

  /** Optimistic, in-place update: no loading screen, no reload, reverts on failure. */
  const patchSubscriptions = async (
    ids: string[],
    patch: {
      tier?: "free" | "pro" | "studio";
      status?: string;
      current_period_start?: string | null;
      current_period_end?: string | null;
      is_lifetime?: boolean;
      granted_at?: string | null;
    },
    successMessage: string,
  ) => {
    const snapshot = subscriptions.filter((s) => ids.includes(s.id));
    applyLocal(ids, patch as Partial<Subscription>);
    markSaving(ids, true);

    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("user_subscriptions")
      .update({
        ...patch,
        ...(patch.tier || patch.is_lifetime !== undefined
          ? { granted_by: auth.user?.id ?? null }
          : {}),
        updated_at: new Date().toISOString(),
      })
      .in("id", ids);

    markSaving(ids, false);

    if (error) {
      setSubscriptions((prev) => {
        const next = prev.map((s) => snapshot.find((o) => o.id === s.id) ?? s);
        setStats(recomputeStats(next));
        return next;
      });
      toast.error(
        error.message.includes("lifetime")
          ? "Lifetime plans can only be changed by a super admin"
          : "Update failed — changes reverted",
      );
      return false;
    }

    toast.success(successMessage);
    return true;
  };

  /** Applies the tier together with the currently selected grant length. */
  const updateSubscriptionTier = (subscriptionId: string, newTier: "free" | "pro" | "studio") => {
    const lifetime = duration === "life";
    const end = newTier === "free" ? null : endDateFor(duration);
    const label = DURATIONS.find((d) => d.value === duration)?.label ?? "";
    return patchSubscriptions(
      [subscriptionId],
      {
        tier: newTier,
        status: "active",
        current_period_start: new Date().toISOString(),
        current_period_end: end,
        is_lifetime: newTier === "free" ? false : lifetime,
        granted_at: new Date().toISOString(),
      },
      newTier === "free" ? "Downgraded to free" : `${newTier} · ${label}`,
    );
  };

  /** Extend / change only the expiry of an existing plan. */
  const updateExpiry = (sub: Subscription, value: string) => {
    const lifetime = value === "life";
    return patchSubscriptions(
      [sub.id],
      {
        status: "active",
        current_period_end: endDateFor(value),
        is_lifetime: lifetime,
        granted_at: new Date().toISOString(),
      },
      lifetime ? "Set to lifetime" : `Expires in ${DURATIONS.find((d) => d.value === value)?.label}`,
    );
  };

  const revokeLifetime = (sub: Subscription) =>
    patchSubscriptions(
      [sub.id],
      { is_lifetime: false, current_period_end: endDateFor("1m") },
      "Lifetime revoked — now expires in 1 month",
    );

  const updateSubscriptionStatus = (subscriptionId: string, newStatus: string) =>
    patchSubscriptions([subscriptionId], { status: newStatus }, "Status updated");

  const bulkSetTier = async (newTier: "free" | "pro" | "studio") => {
    if (selectedIds.length === 0) return;
    setBulkRunning(true);
    const lifetime = duration === "life";
    const label = DURATIONS.find((d) => d.value === duration)?.label ?? "";
    const ok = await patchSubscriptions(
      selectedIds,
      {
        tier: newTier,
        status: "active",
        current_period_start: new Date().toISOString(),
        current_period_end: newTier === "free" ? null : endDateFor(duration),
        is_lifetime: newTier === "free" ? false : lifetime,
        granted_at: new Date().toISOString(),
      },
      `${selectedIds.length} ${selectedIds.length === 1 ? "user" : "users"} moved to ${newTier}${
        newTier === "free" ? "" : ` · ${label}`
      }`,
    );
    setBulkRunning(false);
    if (ok) setSelectedIds([]);
  };

  const getTierBadgeVariant = (tier: string) => {
    switch (tier) {
      case "studio": return "default";
      case "pro": return "secondary";
      default: return "outline";
    }
  };

  const filteredSubscriptions = filterTier === "all" 
    ? subscriptions 
    : subscriptions.filter(s => s.tier === filterTier);

  const allVisibleSelected =
    filteredSubscriptions.length > 0 && filteredSubscriptions.every((s) => selectedIds.includes(s.id));

  const toggleAllVisible = () =>
    setSelectedIds(allVisibleSelected ? [] : filteredSubscriptions.map((s) => s.id));

  const toggleOne = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Subscription Management
        </CardTitle>
        <CardDescription>Manage user subscriptions and tiers</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total</span>
              </div>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Free</span>
              </div>
              <p className="text-2xl font-bold">{stats.free}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Pro</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{stats.pro}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-muted-foreground">Studio</span>
              </div>
              <p className="text-2xl font-bold text-yellow-600">{stats.studio}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Active</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Filter by tier:</span>
          <Select value={filterTier} onValueChange={setFilterTier}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="studio">Studio</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="ghost" size="sm" onClick={fetchSubscriptions} disabled={loading}>
            Refresh
          </Button>
        </div>

        {/* Grant length applied when a tier is changed */}
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <span className="text-sm font-medium">Grant length</span>
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATIONS.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Applied whenever you set a paid tier below. Expired paid plans drop back to Free automatically;
            lifetime plans never expire and can only be revoked by a super admin.
          </p>
        </div>

        {/* Bulk actions — upgrade or downgrade many users in one silent write */}
        {selectedIds.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 p-3">
            <span className="text-sm font-medium">
              {selectedIds.length} selected
              {bulkRunning ? <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin" /> : null}
            </span>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={bulkRunning} onClick={() => bulkSetTier("free")}>
                Set Free
              </Button>
              <Button size="sm" variant="outline" disabled={bulkRunning} onClick={() => bulkSetTier("pro")}>
                Set Pro
              </Button>
              <Button size="sm" variant="outline" disabled={bulkRunning} onClick={() => bulkSetTier("studio")}>
                Set Studio
              </Button>
              <Button size="sm" variant="ghost" disabled={bulkRunning} onClick={() => setSelectedIds([])}>
                Clear
              </Button>
            </div>
          </div>
        ) : null}

        {/* Table */}
        {loading ? (
          <p className="text-muted-foreground">Loading subscriptions...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={toggleAllVisible}
                    aria-label="Select all visible subscriptions"
                  />
                </TableHead>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Change Tier</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Change Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscriptions.map((sub) => (
                <TableRow key={sub.id} data-saving={savingIds.includes(sub.id) || undefined}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(sub.id)}
                      onCheckedChange={() => toggleOne(sub.id)}
                      aria-label={`Select ${sub.user_name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{sub.user_name}</TableCell>
                  <TableCell className="text-muted-foreground">{sub.user_email}</TableCell>
                  <TableCell>
                    <Badge variant={getTierBadgeVariant(sub.tier)}>
                      {sub.tier === "studio" && <Crown className="w-3 h-3 mr-1" />}
                      {sub.tier}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={sub.status === "active" ? "default" : "secondary"}>
                      {sub.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {sub.is_lifetime ? (
                      <Badge variant="default" className="gap-1">
                        <InfinityIcon className="h-3 w-3" /> Lifetime
                      </Badge>
                    ) : sub.current_period_end ? (
                      <span
                        className={
                          new Date(sub.current_period_end) < new Date() ? "text-destructive" : undefined
                        }
                      >
                        {format(new Date(sub.current_period_end), "MMM dd, yyyy")}
                        <span className="block text-xs text-muted-foreground">
                          {new Date(sub.current_period_end) < new Date()
                            ? "expired"
                            : `in ${formatDistanceToNowStrict(new Date(sub.current_period_end))}`}
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={sub.tier}
                      onValueChange={(value) => void updateSubscriptionTier(sub.id, value as "free" | "pro" | "studio")}
                    >
                      <SelectTrigger className="w-[110px]">
                        <SelectValue />
                        {savingIds.includes(sub.id) ? (
                          <Loader2 className="ml-1 h-3 w-3 animate-spin text-muted-foreground" />
                        ) : null}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="studio">Studio</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {sub.is_lifetime ? (
                      isSuperAdmin ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={savingIds.includes(sub.id)}
                          onClick={() => void revokeLifetime(sub)}
                        >
                          Revoke lifetime
                        </Button>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <ShieldAlert className="h-3 w-3" /> Super admin only
                        </span>
                      )
                    ) : (
                      <Select
                        value={undefined}
                        disabled={sub.tier === "free"}
                        onValueChange={(value) => void updateExpiry(sub, value)}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue placeholder="Set expiry" />
                        </SelectTrigger>
                        <SelectContent>
                          {DURATIONS.map((d) => (
                            <SelectItem key={d.value} value={d.value}>
                              {d.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={sub.status}
                      onValueChange={(value) => void updateSubscriptionStatus(sub.id, value)}
                    >
                      <SelectTrigger className="w-[110px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {filteredSubscriptions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    No subscriptions found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
