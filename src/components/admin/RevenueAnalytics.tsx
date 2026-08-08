import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { DollarSign, TrendingUp, CreditCard, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

interface RevenueStats {
  totalRevenue: number;
  transactionCount: number;
  averageTransaction: number;
  revenueChange: number;
}

interface DailyRevenue {
  date: string;
  amount: number;
  count: number;
}

interface RevenueByType {
  type: string;
  amount: number;
  count: number;
}

export const RevenueAnalytics = () => {
  const [timeRange, setTimeRange] = useState("30");
  const [stats, setStats] = useState<RevenueStats>({
    totalRevenue: 0,
    transactionCount: 0,
    averageTransaction: 0,
    revenueChange: 0,
  });
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([]);
  const [revenueByType, setRevenueByType] = useState<RevenueByType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRevenueData();
  }, [timeRange]);

  const loadRevenueData = async () => {
    setLoading(true);
    const days = parseInt(timeRange);
    const startDate = startOfDay(subDays(new Date(), days));
    const previousStartDate = startOfDay(subDays(new Date(), days * 2));

    // Current period transactions
    const { data: currentData } = await supabase
      .from("revenue_transactions")
      .select("*")
      .gte("created_at", startDate.toISOString())
      .eq("status", "completed");

    // Previous period for comparison
    const { data: previousData } = await supabase
      .from("revenue_transactions")
      .select("*")
      .gte("created_at", previousStartDate.toISOString())
      .lt("created_at", startDate.toISOString())
      .eq("status", "completed");

    const currentTotal = currentData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    const previousTotal = previousData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    const revenueChange = previousTotal > 0 
      ? ((currentTotal - previousTotal) / previousTotal) * 100 
      : 0;

    setStats({
      totalRevenue: currentTotal,
      transactionCount: currentData?.length || 0,
      averageTransaction: currentData?.length ? currentTotal / currentData.length : 0,
      revenueChange,
    });

    // Group by day
    const dailyMap = new Map<string, { amount: number; count: number }>();
    for (let i = days; i >= 0; i--) {
      const date = format(subDays(new Date(), i), "yyyy-MM-dd");
      dailyMap.set(date, { amount: 0, count: 0 });
    }

    currentData?.forEach((t) => {
      const date = format(new Date(t.created_at!), "yyyy-MM-dd");
      const current = dailyMap.get(date) || { amount: 0, count: 0 };
      dailyMap.set(date, {
        amount: current.amount + Number(t.amount),
        count: current.count + 1,
      });
    });

    setDailyRevenue(
      Array.from(dailyMap.entries()).map(([date, data]) => ({
        date: format(new Date(date), "MMM dd"),
        amount: data.amount,
        count: data.count,
      }))
    );

    // Group by type
    const typeMap = new Map<string, { amount: number; count: number }>();
    currentData?.forEach((t) => {
      const current = typeMap.get(t.type) || { amount: 0, count: 0 };
      typeMap.set(t.type, {
        amount: current.amount + Number(t.amount),
        count: current.count + 1,
      });
    });

    setRevenueByType(
      Array.from(typeMap.entries()).map(([type, data]) => ({
        type,
        amount: data.amount,
        count: data.count,
      }))
    );

    setLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Revenue Analytics</h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-sm">
              {stats.revenueChange >= 0 ? (
                <>
                  <ArrowUpRight className="w-4 h-4 text-green-500" />
                  <span className="text-green-500">{stats.revenueChange.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="w-4 h-4 text-red-500" />
                  <span className="text-red-500">{Math.abs(stats.revenueChange).toFixed(1)}%</span>
                </>
              )}
              <span className="text-muted-foreground ml-1">vs previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-2xl font-bold">{stats.transactionCount}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Transaction</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.averageTransaction)}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Revenue by Type</p>
              <div className="mt-2 space-y-1">
                {revenueByType.slice(0, 3).map((item) => (
                  <div key={item.type} className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">{item.type}</Badge>
                    <span className="text-sm font-medium">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(v) => `₦${v / 1000}k`} />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transactions by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByType}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
