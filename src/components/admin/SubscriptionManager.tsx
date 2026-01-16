import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CreditCard, Crown, Users, TrendingUp } from "lucide-react";
import { format } from "date-fns";
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
  created_at: string;
}

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

  useEffect(() => {
    fetchSubscriptions();
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
      .select("id, full_name, email")
      .in("id", userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, { name: p.full_name, email: p.email }]) || []);

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
    setSubscriptions(enrichedSubs);
    setLoading(false);
  };

  const updateSubscriptionTier = async (subscriptionId: string, newTier: "free" | "pro" | "studio") => {
    const { error } = await supabase
      .from("user_subscriptions")
      .update({ tier: newTier, updated_at: new Date().toISOString() })
      .eq("id", subscriptionId);

    if (error) {
      toast.error("Failed to update subscription");
      return;
    }

    toast.success(`Subscription updated to ${newTier}`);
    fetchSubscriptions();
  };

  const updateSubscriptionStatus = async (subscriptionId: string, newStatus: string) => {
    const { error } = await supabase
      .from("user_subscriptions")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", subscriptionId);

    if (error) {
      toast.error("Failed to update subscription status");
      return;
    }

    toast.success("Subscription status updated");
    fetchSubscriptions();
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
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-muted-foreground">Loading subscriptions...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Period End</TableHead>
                <TableHead>Change Tier</TableHead>
                <TableHead>Change Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscriptions.map((sub) => (
                <TableRow key={sub.id}>
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
                    {sub.current_period_end 
                      ? format(new Date(sub.current_period_end), "MMM dd, yyyy")
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={sub.tier}
                      onValueChange={(value) => updateSubscriptionTier(sub.id, value as "free" | "pro" | "studio")}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="studio">Studio</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={sub.status}
                      onValueChange={(value) => updateSubscriptionStatus(sub.id, value)}
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
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
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
