import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  BEAUTY_CURRENCIES,
  BEAUTY_SERVICE_MODES,
  BEAUTY_SPECIALTIES,
  type BeautyService,
} from "@/lib/beauty";

interface Props {
  userId: string;
}

const emptyService: BeautyService = { name: "", price_min: null, price_max: null, duration_mins: null };

/**
 * Role-specific fields for Beauty & Grooming creatives: specialties, a service
 * menu with pricing, price range, how they work and where they serve clients.
 */
export const BeautyProfileFields = ({ userId }: Props) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [services, setServices] = useState<BeautyService[]>([]);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [modes, setModes] = useState<string[]>([]);
  const [areas, setAreas] = useState("");
  const [radius, setRadius] = useState("");
  const [years, setYears] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");
  const [accepting, setAccepting] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("beauty_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (data) {
        setSpecialties(data.specialties ?? []);
        setServices(((data.services as unknown as BeautyService[]) ?? []).filter(Boolean));
        setPriceMin(data.price_min != null ? String(data.price_min) : "");
        setPriceMax(data.price_max != null ? String(data.price_max) : "");
        setCurrency(data.currency ?? "USD");
        setModes(data.service_modes ?? []);
        setAreas((data.service_areas ?? []).join(", "));
        setRadius(data.travel_radius_km != null ? String(data.travel_radius_km) : "");
        setYears(data.years_experience != null ? String(data.years_experience) : "");
        setBookingUrl(data.booking_url ?? "");
        setAccepting(data.is_accepting_clients ?? true);
      }
      setLoading(false);
    };
    load();
  }, [userId]);

  const toggle = (list: string[], value: string, setter: (v: string[]) => void) =>
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const num = (value: string): number | null => {
    const parsed = Number(value);
    return value.trim() === "" || Number.isNaN(parsed) ? null : parsed;
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("beauty_profiles").upsert({
      user_id: userId,
      specialties,
      services: services.filter((s) => s.name.trim()) as never,
      price_min: num(priceMin),
      price_max: num(priceMax),
      currency,
      service_modes: modes,
      service_areas: areas
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      travel_radius_km: num(radius),
      years_experience: num(years),
      booking_url: bookingUrl.trim() || null,
      is_accepting_clients: accepting,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Beauty details saved");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading beauty details…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          Beauty &amp; Grooming details
        </CardTitle>
        <CardDescription>
          Clients filter by these fields — list your specialisms, service menu, pricing and where you work.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Specialties</Label>
          <div className="flex flex-wrap gap-2">
            {BEAUTY_SPECIALTIES.map((s) => (
              <Badge
                key={s.value}
                variant={specialties.includes(s.value) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggle(specialties, s.value, setSpecialties)}
              >
                {s.label}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Service menu</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setServices((prev) => [...prev, { ...emptyService }])}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add service
            </Button>
          </div>
          {services.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No services yet — add treatments like "Acrylic full set" or "Hybrid lash fill".
            </p>
          )}
          {services.map((service, index) => (
            <div key={index} className="grid grid-cols-1 gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_90px_90px_90px_auto]">
              <Input
                value={service.name}
                placeholder="Service name"
                aria-label={`Service ${index + 1} name`}
                onChange={(e) =>
                  setServices((prev) => prev.map((s, i) => (i === index ? { ...s, name: e.target.value } : s)))
                }
              />
              <Input
                type="number"
                min={0}
                value={service.price_min ?? ""}
                placeholder="From"
                aria-label={`Service ${index + 1} minimum price`}
                onChange={(e) =>
                  setServices((prev) =>
                    prev.map((s, i) => (i === index ? { ...s, price_min: num(e.target.value) } : s)),
                  )
                }
              />
              <Input
                type="number"
                min={0}
                value={service.price_max ?? ""}
                placeholder="To"
                aria-label={`Service ${index + 1} maximum price`}
                onChange={(e) =>
                  setServices((prev) =>
                    prev.map((s, i) => (i === index ? { ...s, price_max: num(e.target.value) } : s)),
                  )
                }
              />
              <Input
                type="number"
                min={0}
                value={service.duration_mins ?? ""}
                placeholder="Mins"
                aria-label={`Service ${index + 1} duration in minutes`}
                onChange={(e) =>
                  setServices((prev) =>
                    prev.map((s, i) => (i === index ? { ...s, duration_mins: num(e.target.value) } : s)),
                  )
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove service ${index + 1}`}
                onClick={() => setServices((prev) => prev.filter((_, i) => i !== index))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BEAUTY_CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="beauty-price-min">Price range from</Label>
            <Input
              id="beauty-price-min"
              type="number"
              min={0}
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="beauty-price-max">Price range to</Label>
            <Input
              id="beauty-price-max"
              type="number"
              min={0}
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>How do you work?</Label>
          <div className="flex flex-wrap gap-2">
            {BEAUTY_SERVICE_MODES.map((m) => (
              <Badge
                key={m.value}
                variant={modes.includes(m.value) ? "secondary" : "outline"}
                className="cursor-pointer"
                onClick={() => toggle(modes, m.value, setModes)}
              >
                {m.label}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="beauty-areas">Service locations</Label>
            <Input
              id="beauty-areas"
              value={areas}
              onChange={(e) => setAreas(e.target.value)}
              placeholder="Lagos, Abuja, London"
            />
            <p className="text-xs text-muted-foreground">Comma-separated cities or neighbourhoods.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="beauty-radius">Travel radius (km)</Label>
            <Input
              id="beauty-radius"
              type="number"
              min={0}
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="beauty-years">Years of experience</Label>
            <Input
              id="beauty-years"
              type="number"
              min={0}
              value={years}
              onChange={(e) => setYears(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="beauty-booking">Booking link</Label>
            <Input
              id="beauty-booking"
              value={bookingUrl}
              onChange={(e) => setBookingUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="pr-3">
            <p className="text-sm font-medium">Accepting new clients</p>
            <p className="text-xs text-muted-foreground">Turn off when your books are closed.</p>
          </div>
          <Switch checked={accepting} onCheckedChange={setAccepting} aria-label="Accepting new clients" />
        </div>

        <Button type="button" onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save beauty details
        </Button>
      </CardContent>
    </Card>
  );
};