import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Store, Eye, Trash2, ToggleLeft, ToggleRight, Star, ShoppingCart } from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Service {
  id: string;
  title: string;
  description: string | null;
  category: string;
  price: number;
  currency: string | null;
  delivery_days: number | null;
  is_active: boolean | null;
  average_rating: number | null;
  total_reviews: number | null;
  created_at: string;
  seller_id: string;
  seller_name?: string;
}

interface Order {
  id: string;
  service_id: string;
  service_title?: string;
  buyer_id: string;
  buyer_name?: string;
  seller_id: string;
  seller_name?: string;
  amount: number;
  status: string;
  created_at: string;
}

export const MarketplaceManager = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch services
    const { data: servicesData, error: servicesError } = await supabase
      .from("services")
      .select("*")
      .order("created_at", { ascending: false });

    // Fetch orders
    const { data: ordersData, error: ordersError } = await supabase
      .from("service_orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (servicesError || ordersError) {
      toast.error("Failed to fetch marketplace data");
      setLoading(false);
      return;
    }

    // Get all user IDs
    const sellerIds = [...new Set(servicesData?.map(s => s.seller_id) || [])];
    const buyerIds = [...new Set(ordersData?.map(o => o.buyer_id) || [])];
    const allUserIds = [...new Set([...sellerIds, ...buyerIds])];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", allUserIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
    const serviceMap = new Map(servicesData?.map(s => [s.id, s.title]) || []);

    const enrichedServices = servicesData?.map(service => ({
      ...service,
      seller_name: profileMap.get(service.seller_id) || "Unknown",
    })) || [];

    const enrichedOrders = ordersData?.map(order => ({
      ...order,
      service_title: serviceMap.get(order.service_id) || "Unknown Service",
      buyer_name: profileMap.get(order.buyer_id) || "Unknown",
      seller_name: profileMap.get(order.seller_id) || "Unknown",
    })) || [];

    setServices(enrichedServices);
    setOrders(enrichedOrders);
    setLoading(false);
  };

  const toggleServiceStatus = async (serviceId: string, currentStatus: boolean | null) => {
    const { error } = await supabase
      .from("services")
      .update({ is_active: !currentStatus })
      .eq("id", serviceId);

    if (error) {
      toast.error("Failed to update service status");
      return;
    }

    toast.success(`Service ${!currentStatus ? "activated" : "deactivated"}`);
    fetchData();
  };

  const deleteService = async (serviceId: string) => {
    const { error } = await supabase
      .from("services")
      .delete()
      .eq("id", serviceId);

    if (error) {
      toast.error("Failed to delete service");
      return;
    }

    toast.success("Service deleted");
    fetchData();
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from("service_orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      toast.error("Failed to update order status");
      return;
    }

    toast.success("Order status updated");
    fetchData();
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed": return "default";
      case "in_progress": return "secondary";
      case "pending": return "outline";
      case "cancelled": return "destructive";
      default: return "outline";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="w-5 h-5" />
          Marketplace Management
        </CardTitle>
        <CardDescription>Manage services and orders</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="services">
          <TabsList>
            <TabsTrigger value="services">Services ({services.length})</TabsTrigger>
            <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="mt-4">
            {loading ? (
              <p className="text-muted-foreground">Loading services...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {service.title}
                      </TableCell>
                      <TableCell>{service.seller_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{service.category}</Badge>
                      </TableCell>
                      <TableCell>
                        {service.currency || "₦"}{service.price.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          {service.average_rating?.toFixed(1) || "N/A"} ({service.total_reviews || 0})
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={service.is_active ? "default" : "secondary"}>
                          {service.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>{service.title}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <p className="text-muted-foreground">{service.description}</p>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div><strong>Category:</strong> {service.category}</div>
                                  <div><strong>Price:</strong> {service.currency || "₦"}{service.price.toLocaleString()}</div>
                                  <div><strong>Delivery:</strong> {service.delivery_days || "N/A"} days</div>
                                  <div><strong>Created:</strong> {format(new Date(service.created_at), "MMM dd, yyyy")}</div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleServiceStatus(service.id, service.is_active)}
                          >
                            {service.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Service</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{service.title}"?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteService(service.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {services.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No services found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="orders" className="mt-4">
            {loading ? (
              <p className="text-muted-foreground">Loading orders...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium max-w-[150px] truncate">
                        {order.service_title}
                      </TableCell>
                      <TableCell>{order.buyer_name}</TableCell>
                      <TableCell>{order.seller_name}</TableCell>
                      <TableCell>₦{order.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(order.status)}>
                          {order.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(order.created_at), "MMM dd, yyyy")}</TableCell>
                      <TableCell>
                        <Select
                          value={order.status}
                          onValueChange={(value) => updateOrderStatus(order.id, value)}
                        >
                          <SelectTrigger className="w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                  {orders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No orders found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
