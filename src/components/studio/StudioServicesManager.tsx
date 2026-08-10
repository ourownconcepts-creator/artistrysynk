/**
 * Studio services management — one marketplace, one service entity.
 *
 * These rows are ordinary `services` records carrying a `studio_id`. Authorization
 * is `has_studio_capability` in RLS; the capability checks below only decide which
 * controls to render, and the studio lifecycle gate is inherited from `can()`.
 */
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Link } from "@/lib/router-compat";
import { ExternalLink, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useServiceTaxonomy } from "@/hooks/useServiceTaxonomy";
import {
  can,
  createStudioService,
  deleteStudioService,
  fetchStudioServicesForMember,
  updateStudioService,
  type StudioRole,
  type StudioService,
} from "@/lib/studios";

type Props = {
  studioId: string;
  studioHandle: string;
  role: StudioRole | null;
  studioActive: boolean;
  userId: string | undefined;
};

const EMPTY = { title: "", description: "", category: "", subcategory: "", price: "", delivery_days: "7" };

export const StudioServicesManager = ({ studioId, studioHandle, role, studioActive, userId }: Props) => {
  const { categoryLabels, getSubcategoriesFor } = useServiceTaxonomy();
  const [services, setServices] = useState<StudioService[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const lifecycle = { studioActive };
  const canManage = can(role, "manage_services", lifecycle);
  const canDelete = can(role, "delete_services", lifecycle);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setServices(await fetchStudioServicesForMember(studioId));
    } catch {
      toast.error("Could not load studio services");
    } finally {
      setLoading(false);
    }
  }, [studioId]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!userId) return;
    if (!form.title.trim() || !form.category || !form.price) {
      toast.error("Add a title, category and price");
      return;
    }
    const price = Number(form.price);
    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Enter a valid price");
      return;
    }
    setSaving(true);
    try {
      await createStudioService({
        studioId,
        sellerId: userId,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        subcategory: form.subcategory || undefined,
        price,
        deliveryDays: Number(form.delivery_days) || 7,
      });
      setForm(EMPTY);
      toast.success("Service published to the marketplace");
      await load();
    } catch {
      toast.error("Could not create that service");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Publish a studio service</CardTitle>
            <CardDescription>
              Studio services are listed in the ArtistrySynk marketplace and on your public studio page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="svc-title">Title</Label>
                <Input
                  id="svc-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Full day recording session"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="svc-category">Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v, subcategory: "" })}
                >
                  <SelectTrigger id="svc-category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryLabels.map((label) => (
                      <SelectItem key={label} value={label}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.category && getSubcategoriesFor(form.category).length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="svc-subcategory">Subcategory</Label>
                  <Select value={form.subcategory} onValueChange={(v) => setForm({ ...form, subcategory: v })}>
                    <SelectTrigger id="svc-subcategory">
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      {getSubcategoriesFor(form.category).map((sub) => (
                        <SelectItem key={sub} value={sub}>
                          {sub}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="svc-price">Price (₦)</Label>
                <Input
                  id="svc-price"
                  type="number"
                  min={1}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="svc-delivery">Delivery (days)</Label>
                <Input
                  id="svc-delivery"
                  type="number"
                  min={1}
                  value={form.delivery_days}
                  onChange={(e) => setForm({ ...form, delivery_days: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="svc-description">Description</Label>
              <Textarea
                id="svc-description"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What the client gets, and what you need from them."
              />
            </div>
            <Button onClick={create} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Publish service
            </Button>
          </CardContent>
        </Card>
      )}

      {!canManage && (
        <p className="text-sm text-muted-foreground">
          {studioActive
            ? "Your role can view studio services but not manage them."
            : "Service management is paused while this studio is inactive."}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Studio services ({services.length})</CardTitle>
          <CardDescription>
            Orders, reviews and payouts run through the existing marketplace.{" "}
            <Link to={`/studios/${studioHandle}`} className="underline underline-offset-2">
              View public page
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : services.length === 0 ? (
            <p className="text-sm text-muted-foreground">No studio services yet.</p>
          ) : (
            services.map((service) => (
              <div key={service.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="font-medium">{service.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {[service.category, service.subcategory].filter(Boolean).join(" · ")} · ₦
                    {Number(service.price).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={service.is_active ? "secondary" : "outline"}>
                    {service.is_active ? "Live" : "Hidden"}
                  </Badge>
                  {canManage && (
                    <div className="flex items-center gap-2">
                      <Switch
                        aria-label={`Toggle ${service.title}`}
                        checked={!!service.is_active}
                        onCheckedChange={async (checked) => {
                          try {
                            await updateStudioService(service.id, { is_active: checked });
                            setServices((prev) =>
                              prev.map((s) => (s.id === service.id ? { ...s, is_active: checked } : s)),
                            );
                          } catch {
                            toast.error("Could not update that service");
                          }
                        }}
                      />
                      <Button variant="ghost" size="sm" asChild aria-label={`Open ${service.title} in marketplace`}>
                        <Link to={`/marketplace?service=${service.id}`}>
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </Link>
                      </Button>
                    </div>
                  )}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Delete ${service.title}`}
                      onClick={async () => {
                        try {
                          await deleteStudioService(service.id);
                          setServices((prev) => prev.filter((s) => s.id !== service.id));
                          toast.success("Service removed");
                        } catch {
                          toast.error("Could not remove that service");
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
