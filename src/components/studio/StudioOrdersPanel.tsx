import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Receipt, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  can,
  fetchStudioOrders,
  fetchStudioRevenue,
  STUDIO_ORDER_STATUSES,
  updateStudioOrderStatus,
  type StudioOrder,
  type StudioRevenueSummary,
  type StudioRole,
} from "@/lib/studios";

type Props = {
  studioId: string;
  role: StudioRole | null;
  studioActive: boolean;
  permissions?: Record<string, unknown> | null;
};

const STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-500",
  in_progress: "bg-blue-500/15 text-blue-500",
  delivered: "bg-purple-500/15 text-purple-500",
  completed: "bg-emerald-500/15 text-emerald-500",
  cancelled: "bg-destructive/15 text-destructive",
};

/**
 * Studio-side view of orders placed against the studio's marketplace services.
 * There is no separate order system: these are ordinary `service_orders` rows
 * attributed to the studio by a database trigger.
 */
export function StudioOrdersPanel({ studioId, role, studioActive, permissions }: Props) {
  const [orders, setOrders] = useState<StudioOrder[]>([]);
  const [revenue, setRevenue] = useState<StudioRevenueSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const canView = can(role, "view_analytics", { permissions, studioActive });
  const canManage = can(role, "manage_services", { permissions, studioActive });

  const load = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [orderRows, revenueSummary] = await Promise.all([
        fetchStudioOrders(studioId),
        fetchStudioRevenue(studioId),
      ]);
      setOrders(orderRows);
      setRevenue(revenueSummary);
    } catch {
      toast.error("Could not load studio orders");
    } finally {
      setLoading(false);
    }
  }, [canView, studioId]);

  useEffect(() => {
    void load();
  }, [load]);

  const changeStatus = async (order: StudioOrder, status: string) => {
    const previous = order.status;
    setOrders((rows) => rows.map((r) => (r.id === order.id ? { ...r, status } : r)));
    try {
      await updateStudioOrderStatus(order.id, status);
      toast.success("Order updated");
    } catch {
      setOrders((rows) => rows.map((r) => (r.id === order.id ? { ...r, status: previous } : r)));
      toast.error("You do not have permission to update this order");
    }
  };

  if (!canView) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
          <CardDescription>
            Your studio role does not include order and revenue visibility.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Orders
            </CardDescription>
            <CardTitle className="text-2xl">{orders.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Attributed revenue
            </CardDescription>
            <CardTitle className="text-2xl">
              {revenue ? `${revenue.currency} ${revenue.total.toLocaleString()}` : "—"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Studio orders</CardTitle>
          <CardDescription>
            Orders placed on services published under this studio.
            {!studioActive && " Management is locked while the studio is inactive."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : orders.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No studio orders yet.</p>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{order.services?.title ?? "Service"}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString()} · {Number(order.amount).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_TONE[order.status] ?? "bg-muted text-muted-foreground"}>
                    {order.status.replace(/_/g, " ")}
                  </Badge>
                  {canManage && (
                    <Select value={order.status} onValueChange={(value) => void changeStatus(order, value)}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STUDIO_ORDER_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
