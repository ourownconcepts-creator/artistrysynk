import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { toast } from "sonner";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UpgradePrompt } from "@/components/subscription/UpgradePrompt";
import { VerificationGate } from "@/components/verification/VerificationGate";
import { useSubscription } from "@/hooks/useSubscription";
import { useAppUser } from "@/hooks/useAppUser";
import {
  createStudio,
  handleError,
  isHandleAvailable,
  normalizeHandle,
  STUDIO_FACILITIES,
  STUDIO_ORG_TYPES,
  type StudioOrgType,
} from "@/lib/studios";

const StudioCreate = () => {
  const navigate = useNavigate();
  const { user } = useAppUser();
  const { isStudio, loading: subLoading } = useSubscription();

  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [handleTouched, setHandleTouched] = useState(false);
  const [orgType, setOrgType] = useState<StudioOrgType>("studio");
  const [tagline, setTagline] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [facilities, setFacilities] = useState<string[]>([]);
  const [availability, setAvailability] = useState<"idle" | "checking" | "free" | "taken">("idle");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!handleTouched) setHandle(normalizeHandle(name));
  }, [name, handleTouched]);

  useEffect(() => {
    if (handleError(handle)) {
      setAvailability("idle");
      return;
    }
    setAvailability("checking");
    const t = setTimeout(async () => {
      setAvailability((await isHandleAvailable(handle)) ? "free" : "taken");
    }, 400);
    return () => clearTimeout(t);
  }, [handle]);

  const toggleFacility = (facility: string) =>
    setFacilities((prev) => (prev.includes(facility) ? prev.filter((f) => f !== facility) : [...prev, facility]));

  const submit = async () => {
    if (!user) return;
    if (!name.trim()) {
      toast.error("Give your studio a name");
      return;
    }
    const invalid = handleError(handle);
    if (invalid) {
      toast.error(invalid);
      return;
    }
    if (availability === "taken") {
      toast.error("That handle is already taken");
      return;
    }
    setSaving(true);
    try {
      const studio = await createStudio({
        handle,
        name: name.trim(),
        orgType,
        tagline: tagline.trim(),
        bio: bio.trim(),
        city: city.trim(),
        country: country.trim(),
        contactEmail: contactEmail.trim(),
        facilities,
      });
      toast.success("Studio created");
      navigate(`/studios/${studio.handle}/manage`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the studio");
    } finally {
      setSaving(false);
    }
  };

  if (subLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isStudio) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16">
        <UpgradePrompt
          feature="Studios"
          description="Create a studio page with your team, gear and portfolio — built for recording studios, agencies, labels and production companies."
        />
      </div>
    );
  }

  return (
    <VerificationGate
      capability="studio_create"
      description="Creating a studio, agency or label requires a verified identity so clients can trust who they are booking."
    >
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Create your studio</h1>
      <p className="mt-2 text-muted-foreground">
        You'll be the owner. Invite your team, list your gear and publish your work once it's live.
      </p>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Identity</CardTitle>
          <CardDescription>How your studio appears across ArtistrySynk and in search results.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="studio-name">Studio name</Label>
            <Input
              id="studio-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Neon Room Studios"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="studio-handle">Handle</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/studios/</span>
              <Input
                id="studio-handle"
                value={handle}
                onChange={(e) => {
                  setHandleTouched(true);
                  setHandle(normalizeHandle(e.target.value));
                }}
                placeholder="neon-room"
              />
              {availability === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              {availability === "free" && <Check className="h-4 w-4 text-primary" />}
              {availability === "taken" && <X className="h-4 w-4 text-destructive" />}
            </div>
            <p className="text-xs text-muted-foreground">
              {handle && handleError(handle)
                ? handleError(handle)
                : availability === "taken"
                  ? "That handle is taken"
                  : "Lowercase letters, numbers, dashes and underscores."}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={orgType} onValueChange={(v) => setOrgType(v as StudioOrgType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STUDIO_ORG_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="studio-tagline">Tagline</Label>
            <Input
              id="studio-tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="One line on what you're known for"
              maxLength={140}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="studio-bio">About</Label>
            <Textarea
              id="studio-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={5}
              placeholder="Your rooms, your sound, who you work with…"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="studio-city">City</Label>
              <Input id="studio-city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="studio-country">Country</Label>
              <Input id="studio-country" value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="studio-email">Booking email</Label>
            <Input
              id="studio-email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="bookings@yourstudio.com"
            />
          </div>

          <div className="space-y-2">
            <Label>Facilities</Label>
            <div className="flex flex-wrap gap-2">
              {STUDIO_FACILITIES.map((facility) => (
                <Badge
                  key={facility}
                  variant={facilities.includes(facility) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleFacility(facility)}
                >
                  {facility}
                </Badge>
              ))}
            </div>
          </div>

          <Button onClick={submit} disabled={saving} className="w-full">
            {saving ? "Creating…" : "Create studio"}
          </Button>
        </CardContent>
      </Card>
    </div>
    </VerificationGate>
  );
};

export default StudioCreate;