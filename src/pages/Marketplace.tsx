import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Search, Plus, ShoppingCart, Clock, DollarSign, Star, Package, MessageSquare, Link2, X } from "lucide-react";
import { ServiceReviewDialog } from "@/components/marketplace/ServiceReviewDialog";
import { MarketplaceAutocomplete } from "@/components/marketplace/MarketplaceAutocomplete";
import { useServiceTaxonomy } from "@/hooks/useServiceTaxonomy";

interface Service {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  category: string;
  subcategory?: string | null;
  price: number;
  currency: string | null;
  delivery_days: number | null;
  created_at: string;
  average_rating: number | null;
  total_reviews: number | null;
  profiles?: {
    full_name: string;
    username: string;
    avatar_url: string | null;
    is_verified: boolean | null;
  };
}

interface Order {
  id: string;
  service_id: string;
  buyer_id: string;
  seller_id: string;
  status: string;
  amount: number;
  created_at: string;
  delivery_date: string | null;
  services: {
    title: string;
    seller_id?: string;
  };
  buyer_profile?: {
    full_name: string;
  };
  seller_profile?: {
    full_name: string;
  };
}

const Marketplace = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories, subcategories, categoryLabels, getSubcategoriesFor } = useServiceTaxonomy();
  const [services, setServices] = useState<Service[]>([]);
  const [myServices, setMyServices] = useState<Service[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [sellerOrders, setSellerOrders] = useState<Order[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") ?? "");
  const [categoryFilter, setCategoryFilter] = useState<string>(searchParams.get("category") ?? "all");
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>(searchParams.get("subcategory") ?? "all");
  const [serviceFilter, setServiceFilter] = useState<string | null>(searchParams.get("service"));

  // Keep the URL in sync so filters are shareable / bookmarkable
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    const apply = (key: string, value: string | null) => {
      if (value && value !== "all") next.set(key, value);
      else next.delete(key);
    };
    apply("q", searchQuery.trim());
    apply("category", categoryFilter);
    apply("subcategory", subcategoryFilter);
    apply("service", serviceFilter);
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, categoryFilter, subcategoryFilter, serviceFilter]);

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Filter link copied to clipboard");
    } catch {
      toast.error("Could not copy the link");
    }
  };
  
  // New service form
  const [newServiceOpen, setNewServiceOpen] = useState(false);
  const [newService, setNewService] = useState({
    title: "",
    description: "",
    category: "",
    subcategory: "",
    price: "",
    delivery_days: "7",
  });

  // Order form
  const [orderingService, setOrderingService] = useState<Service | null>(null);
  const [orderRequirements, setOrderRequirements] = useState("");
  
  // Review state
  const [reviewingOrder, setReviewingOrder] = useState<Order | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setCurrentUser(user.id);
        loadData(user.id);
      }
    });
  }, [navigate]);

  const loadData = async (userId: string) => {
    await Promise.all([
      loadServices(),
      loadMyServices(userId),
      loadMyOrders(userId),
      loadSellerOrders(userId),
    ]);
    setLoading(false);
  };

  const loadServices = async () => {
    const { data: servicesData } = await supabase
      .from("services")
      .select("*, average_rating, total_reviews")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (servicesData && servicesData.length > 0) {
      const sellerIds = [...new Set(servicesData.map(s => s.seller_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, is_verified")
        .in("id", sellerIds);

      const servicesWithProfiles = servicesData.map(s => ({
        ...s,
        profiles: profiles?.find(p => p.id === s.seller_id),
      }));
      setServices(servicesWithProfiles as Service[]);
    } else {
      setServices([]);
    }
  };

  const loadMyServices = async (userId: string) => {
    const { data } = await supabase
      .from("services")
      .select("*")
      .eq("seller_id", userId)
      .order("created_at", { ascending: false });

    setMyServices(data || []);
  };

  const loadMyOrders = async (userId: string) => {
    const { data } = await supabase
      .from("service_orders")
      .select(`
        *,
        services(title)
      `)
      .eq("buyer_id", userId)
      .order("created_at", { ascending: false });

    setMyOrders(data || []);
  };

  const loadSellerOrders = async (userId: string) => {
    const { data } = await supabase
      .from("service_orders")
      .select(`
        *,
        services(title, seller_id)
      `)
      .eq("seller_id", userId)
      .order("created_at", { ascending: false });

    // Fetch buyer profiles for orders
    if (data && data.length > 0) {
      const buyerIds = [...new Set(data.map(order => order.buyer_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", buyerIds);
      
      const ordersWithProfiles = data.map(order => ({
        ...order,
        buyer_profile: profiles?.find(p => p.id === order.buyer_id)
      }));
      
      setSellerOrders(ordersWithProfiles);
    } else {
      setSellerOrders(data || []);
    }
  };

  const createService = async () => {
    if (!newService.title || !newService.category || !newService.price) {
      toast.error("Please fill in all required fields");
      return;
    }

    const { error } = await supabase.from("services").insert({
      seller_id: currentUser,
      title: newService.title,
      description: newService.description,
      category: newService.category,
      subcategory: newService.subcategory || null,
      price: parseFloat(newService.price),
      delivery_days: parseInt(newService.delivery_days),
    } as any);

    if (error) {
      toast.error("Failed to create service");
    } else {
      toast.success("Service created!");
      setNewServiceOpen(false);
      setNewService({ title: "", description: "", category: "", subcategory: "", price: "", delivery_days: "7" });
      loadMyServices(currentUser!);
      loadServices();
    }
  };

  const placeOrder = async () => {
    if (!orderingService || !currentUser) return;

    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + (orderingService.delivery_days ?? 7));

    const { error } = await supabase.from("service_orders").insert({
      service_id: orderingService.id,
      buyer_id: currentUser,
      seller_id: orderingService.seller_id,
      amount: orderingService.price,
      requirements: orderRequirements,
      delivery_date: deliveryDate.toISOString(),
    });

    if (error) {
      toast.error("Failed to place order");
    } else {
      toast.success("Order placed successfully!");
      setOrderingService(null);
      setOrderRequirements("");
      loadMyOrders(currentUser);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    if (!currentUser) return;
    // Get order details for notification
    const order = sellerOrders.find(o => o.id === orderId);
    
    const { error } = await supabase.from("service_orders").update({ status }).eq("id", orderId);
    
    if (error) {
      toast.error("Failed to update order status");
      return;
    }
    
    // Send email notification for status change
    if (order && (status === "in_progress" || status === "completed" || status === "cancelled")) {
      try {
        // Get buyer's profile + email (email via secure RPC)
        const { data: buyerProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", order.buyer_id)
          .single();
        const { data: buyerEmailRows } = await supabase.rpc("get_profile_emails", { _user_ids: [order.buyer_id] });
        
        // Get seller profile for the name
        const { data: sellerProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", currentUser)
          .single();
        
        const buyerEmail = buyerEmailRows?.[0]?.email;
        
        if (buyerEmail) {
          // Call the edge function with buyer email
          await supabase.functions.invoke("notify-order-status", {
            body: {
              orderId,
              serviceTitle: order.services?.title || "Service",
              buyerEmail: buyerEmail,
              buyerName: buyerProfile?.full_name || order.buyer_profile?.full_name || "Customer",
              sellerName: sellerProfile?.full_name || "Seller",
              newStatus: status,
              amount: order.amount
            }
          });
          console.log("Order status notification sent to:", buyerEmail);
        } else {
          console.log("Order status updated, but no email found for buyer:", order.buyer_id);
        }
      } catch (notifyError) {
        console.log("Notification skipped:", notifyError);
      }
    }
    
    loadSellerOrders(currentUser!);
    toast.success(`Order marked as ${status.replace(/_/g, ' ')}`);
  };

  const filteredServices = services.filter((s) => {
    const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || s.category === categoryFilter;
    const matchesSubcategory = subcategoryFilter === "all" || s.subcategory === subcategoryFilter;
    const matchesService = !serviceFilter || s.id === serviceFilter;
    return matchesSearch && matchesCategory && matchesSubcategory && matchesService && s.seller_id !== currentUser;
  });

  const categoryCounts = services.reduce<Record<string, number>>((acc, s) => {
    if (s.seller_id === currentUser) return acc;
    acc[s.category] = (acc[s.category] || 0) + 1;
    return acc;
  }, {});

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "default";
      case "in_progress": return "secondary";
      case "pending": return "outline";
      case "cancelled": return "destructive";
      default: return "secondary";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-4">
      <div className="max-w-6xl mx-auto py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Talent Marketplace
            </h1>
            <p className="text-muted-foreground">Buy and sell creative services</p>
          </div>
          <Dialog open={newServiceOpen} onOpenChange={setNewServiceOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Sell a Service
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Service</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Service Title *</Label>
                  <Input
                    value={newService.title}
                    onChange={(e) => setNewService({ ...newService, title: e.target.value })}
                    placeholder="e.g., Professional Beat Production"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newService.description}
                    onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                    placeholder="Describe what you're offering..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select
                    value={newService.category}
                    onValueChange={(v) => setNewService({ ...newService, category: v, subcategory: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryLabels.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Subcategory</Label>
                  <Select
                    value={newService.subcategory}
                    onValueChange={(v) => setNewService({ ...newService, subcategory: v })}
                    disabled={!newService.category}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={newService.category ? "Select subcategory" : "Pick a category first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {getSubcategoriesFor(newService.category).map((sub) => (
                        <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Price (₦) *</Label>
                    <Input
                      type="number"
                      value={newService.price}
                      onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                      placeholder="5000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Delivery (days)</Label>
                    <Input
                      type="number"
                      value={newService.delivery_days}
                      onChange={(e) => setNewService({ ...newService, delivery_days: e.target.value })}
                    />
                  </div>
                </div>
                <Button onClick={createService} className="w-full">Create Service</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="browse" className="space-y-6">
          <TabsList>
            <TabsTrigger value="browse">Browse Services</TabsTrigger>
            <TabsTrigger value="my-services">My Services</TabsTrigger>
            <TabsTrigger value="my-orders">My Orders</TabsTrigger>
            <TabsTrigger value="seller-orders">Seller Dashboard</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-6">
            <div className="flex gap-4">
              <MarketplaceAutocomplete
                query={searchQuery}
                onQueryChange={setSearchQuery}
                categories={categoryLabels}
                subcategories={subcategories}
                services={services.filter((s) => s.seller_id !== currentUser)}
                onSelectCategory={(cat) => {
                  setCategoryFilter(cat);
                  setSubcategoryFilter("all");
                  setServiceFilter(null);
                }}
                onSelectSubcategory={(cat, sub) => {
                  setCategoryFilter(cat);
                  setSubcategoryFilter(sub);
                  setServiceFilter(null);
                }}
                onSelectService={(svc) => {
                  setCategoryFilter(svc.category);
                  setSubcategoryFilter(svc.subcategory || "all");
                  setServiceFilter(svc.id);
                }}
              />
              <Select
                value={categoryFilter}
                onValueChange={(v) => {
                  setCategoryFilter(v);
                  setSubcategoryFilter("all");
                  setServiceFilter(null);
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categoryLabels.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={subcategoryFilter}
                onValueChange={(v) => {
                  setSubcategoryFilter(v);
                  setServiceFilter(null);
                }}
                disabled={categoryFilter === "all"}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Subcategories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subcategories</SelectItem>
                  {getSubcategoriesFor(categoryFilter).map((sub) => (
                    <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={copyShareLink} aria-label="Copy shareable link with current filters">
                <Link2 className="w-4 h-4" />
              </Button>
            </div>

            {serviceFilter && (
              <Badge variant="secondary" className="px-3 py-1.5">
                Showing a single service
                <button
                  className="ml-2"
                  aria-label="Clear service filter"
                  onClick={() => {
                    setServiceFilter(null);
                    setSearchQuery("");
                  }}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}

            {/* Category → Subcategory browser */}
            {categoryFilter === "all" ? (
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <Badge
                    key={cat.label}
                    variant="outline"
                    role="button"
                    tabIndex={0}
                    aria-label={`Browse ${cat.label} services`}
                    className="cursor-pointer px-3 py-1.5 hover:bg-accent"
                    onClick={() => setCategoryFilter(cat.label)}
                    onKeyDown={(e) => e.key === "Enter" && setCategoryFilter(cat.label)}
                  >
                    {cat.label}
                    <span className="ml-2 text-xs text-muted-foreground">{categoryCounts[cat.label] || 0}</span>
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <button
                    className="hover:text-foreground underline-offset-2 hover:underline"
                    onClick={() => {
                      setCategoryFilter("all");
                      setSubcategoryFilter("all");
                    }}
                  >
                    All Categories
                  </button>
                  <span>/</span>
                  <button
                    className="hover:text-foreground underline-offset-2 hover:underline"
                    onClick={() => setSubcategoryFilter("all")}
                  >
                    {categoryFilter}
                  </button>
                  {subcategoryFilter !== "all" && (
                    <>
                      <span>/</span>
                      <span className="text-foreground font-medium">{subcategoryFilter}</span>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {getSubcategoriesFor(categoryFilter).map((sub) => (
                    <Badge
                      key={sub}
                      variant={subcategoryFilter === sub ? "default" : "outline"}
                      role="button"
                      tabIndex={0}
                      aria-label={`Filter by ${sub}`}
                      className="cursor-pointer px-3 py-1.5 hover:bg-accent"
                      onClick={() => setSubcategoryFilter(subcategoryFilter === sub ? "all" : sub)}
                      onKeyDown={(e) => e.key === "Enter" && setSubcategoryFilter(subcategoryFilter === sub ? "all" : sub)}
                    >
                      {sub}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {filteredServices.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h2 className="text-xl font-semibold mb-2">No services found</h2>
                  <p className="text-muted-foreground">Try adjusting your search or filters</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredServices.map((service) => (
                  <Card key={service.id} className="flex flex-col">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg line-clamp-2">{service.title}</CardTitle>
                        {service.profiles?.is_verified && (
                          <Badge variant="secondary" className="ml-2 shrink-0">
                            <Star className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        by {service.profiles?.full_name || "Unknown"}{' '}
                        {service.profiles?.username && <span className="text-xs">@{service.profiles.username}</span>}
                      </p>
                    </CardHeader>
                    <CardContent className="flex-1">
                      {service.description && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                          {service.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1 mb-2">
                        <Badge variant="outline">{service.category}</Badge>
                        {service.subcategory && <Badge variant="secondary">{service.subcategory}</Badge>}
                      </div>
                      
                      {/* Star Rating Display */}
                      {(service.total_reviews || 0) > 0 && (
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= Math.round(service.average_rating || 0) 
                                    ? "fill-yellow-400 text-yellow-400" 
                                    : "text-muted-foreground/30"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {(service.average_rating || 0).toFixed(1)} ({service.total_reviews})
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1 text-primary font-semibold">
                          <DollarSign className="w-4 h-4" />
                          ₦{service.price.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          {service.delivery_days} days
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Dialog open={orderingService?.id === service.id} onOpenChange={(open) => setOrderingService(open ? service : null)}>
                        <DialogTrigger asChild>
                          <Button className="w-full">
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Order Now
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Order: {service.title}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="p-4 bg-muted rounded-lg">
                              <div className="flex justify-between mb-2">
                                <span>Price:</span>
                                <span className="font-semibold">₦{service.price.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Delivery:</span>
                                <span>{service.delivery_days} days</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Requirements / Brief</Label>
                              <Textarea
                                value={orderRequirements}
                                onChange={(e) => setOrderRequirements(e.target.value)}
                                placeholder="Describe what you need..."
                                rows={4}
                              />
                            </div>
                            <Button onClick={placeOrder} className="w-full">
                              Place Order - ₦{service.price.toLocaleString()}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my-services">
            {myServices.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h2 className="text-xl font-semibold mb-2">No services yet</h2>
                  <p className="text-muted-foreground mb-4">Start selling your creative services</p>
                  <Button onClick={() => setNewServiceOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Service
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myServices.map((service) => (
                  <Card key={service.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{service.title}</CardTitle>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline">{service.category}</Badge>
                        {service.subcategory && <Badge variant="secondary">{service.subcategory}</Badge>}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {service.description}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-primary">₦{service.price.toLocaleString()}</span>
                        <span className="text-muted-foreground">{service.delivery_days} days</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my-orders">
            {myOrders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
                  <p className="text-muted-foreground">Browse services and place your first order</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {myOrders.map((order) => (
                  <Card key={order.id}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{order.services?.title}</p>
                          <p className="text-sm text-muted-foreground">
                            ₦{order.amount.toLocaleString()}
                          </p>
                        </div>
                        <Badge variant={getStatusColor(order.status) as any}>
                          {order.status}
                        </Badge>
                        {order.status === "completed" && (
                          <Button size="sm" variant="outline" onClick={() => setReviewingOrder(order)}>
                            <MessageSquare className="w-3 h-3 mr-1" />
                            Review
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="seller-orders">
            {sellerOrders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h2 className="text-xl font-semibold mb-2">No orders received</h2>
                  <p className="text-muted-foreground">Orders for your services will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {sellerOrders.map((order) => (
                  <Card key={order.id}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{order.services?.title}</p>
                          <p className="text-sm text-muted-foreground">
                            ₦{order.amount.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusColor(order.status) as any}>
                            {order.status}
                          </Badge>
                          {order.status === "pending" && (
                            <Button size="sm" onClick={() => updateOrderStatus(order.id, "in_progress")}>
                              Start
                            </Button>
                          )}
                          {order.status === "in_progress" && (
                            <Button size="sm" onClick={() => updateOrderStatus(order.id, "completed")}>
                              Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        {/* Review Dialog */}
        {reviewingOrder && (
          <ServiceReviewDialog
            open={!!reviewingOrder}
            onOpenChange={(open) => !open && setReviewingOrder(null)}
            orderId={reviewingOrder.id}
            serviceId={reviewingOrder.service_id}
            sellerId={(reviewingOrder as any).seller_id}
            serviceName={reviewingOrder.services?.title || "Service"}
            onReviewSubmitted={() => {
              setReviewingOrder(null);
              loadMyOrders(currentUser!);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Marketplace;