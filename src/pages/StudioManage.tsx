import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "@/lib/router-compat";
import { toast } from "sonner";
import { BadgeCheck, ExternalLink, Loader2, Plus, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppUser } from "@/hooks/useAppUser";
import { UPLOAD_BUCKETS, UPLOAD_LIMITS, UPLOAD_RULES, validateUpload, extensionFor } from "@/config/uploads";
import {
  can,
  deleteStudioEquipment,
  fetchStudioEquipmentForMember,
  EQUIPMENT_PAGE_SIZE,
  fetchStudioForMember,
  fetchStudioRoster,
  inviteToStudio,
  removeStudioMember,
  requestStudioVerification,
  setStudioActive,
  STUDIO_FACILITIES,
  STUDIO_ROLE_LABELS,
  STUDIO_ROLES,
  transferStudioOwnership,
  updateStudio,
  updateStudioMemberRole,
  upsertStudioEquipment,
  type StudioEquipment,
  type StudioRecord,
  type StudioRole,
  type StudioRosterRow,
} from "@/lib/studios";

type RosterProfile = { id: string; full_name: string | null; username: string | null; avatar_url: string | null };

const StudioManage = () => {
  const { handle = "" } = useParams<{ handle: string }>();
  const { user } = useAppUser();

  const [studio, setStudio] = useState<StudioRecord | null>(null);
  const [role, setRole] = useState<StudioRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [transferTo, setTransferTo] = useState("");

  const [form, setForm] = useState({
    name: "",
    tagline: "",
    bio: "",
    primary_city: "",
    primary_country: "",
    contact_email: "",
    facilities: [] as string[],
    visibility: "public",
    is_active: true,
  });

  const [roster, setRoster] = useState<StudioRosterRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, RosterProfile>>({});
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteRole, setInviteRole] = useState<StudioRole>("staff");
  const [inviteTitle, setInviteTitle] = useState("");

  const [equipment, setEquipment] = useState<StudioEquipment[]>([]);
  const [gearDone, setGearDone] = useState(false);
  const [gearLoadingMore, setGearLoadingMore] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", category: "", brand: "", model: "", quantity: 1 });

  const loadRoster = useCallback(async (studioId: string) => {
    const rows = await fetchStudioRoster(studioId);
    setRoster(rows);
    if (rows.length) {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", rows.map((r) => r.user_id));
      setProfiles(Object.fromEntries(((data ?? []) as RosterProfile[]).map((p) => [p.id, p])));
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const record = await fetchStudioForMember(handle);
        if (!active) return;
        setStudio(record);
        if (!record) {
          setLoading(false);
          return;
        }
        setForm({
          name: record.name,
          tagline: record.tagline ?? "",
          bio: record.bio ?? "",
          primary_city: record.primary_city ?? "",
          primary_country: record.primary_country ?? "",
          contact_email: record.contact_email ?? "",
          facilities: record.facilities ?? [],
          visibility: record.visibility,
          is_active: record.is_active,
        });
        const { data: membership } = await supabase
          .from("studio_members")
          .select("role")
          .eq("studio_id", record.id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (!active) return;
        setRole((membership?.role as StudioRole | undefined) ?? null);
        await loadRoster(record.id);
        const gear = await fetchStudioEquipmentForMember(record.id);
        setEquipment(gear);
        setGearDone(gear.length < EQUIPMENT_PAGE_SIZE);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [handle, user, loadRoster]);

  // Mirrors the server lifecycle gate: a deactivated studio keeps all its data
  // but normal management is unavailable until the owner reactivates it.
  const lifecycle = { studioActive: studio?.is_active !== false };
  const canManageStudio = can(role, "manage_studio", lifecycle);
  const canManageMembers = can(role, "manage_members", lifecycle);
  const canManageGear = can(role, "manage_equipment", lifecycle);
  const isOwner = !!studio && !!user && studio.owner_id === user.id;

  const saveProfile = async () => {
    if (!studio) return;
    setSaving(true);
    try {
      await updateStudio(studio.id, {
        name: form.name.trim(),
        tagline: form.tagline.trim() || null,
        bio: form.bio.trim() || null,
        primary_city: form.primary_city.trim() || null,
        primary_country: form.primary_country.trim() || null,
        contact_email: form.contact_email.trim() || null,
        facilities: form.facilities,
        visibility: form.visibility,
      });
      toast.success("Studio updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save changes");
    } finally {
      setSaving(false);
    }
  };

  const uploadBrandMedia = async (file: File, kind: "logo" | "cover") => {
    if (!studio) return;
    const check = validateUpload(file, ["image"], UPLOAD_LIMITS.profileImage);
    if (!check.ok) {
      toast.error(check.error);
      return;
    }
    const path = `studios/${studio.id}/${kind}/${crypto.randomUUID()}.${extensionFor(file, "jpg")}`;
    const { error } = await supabase.storage.from(UPLOAD_BUCKETS.portfolios).upload(path, file, { upsert: true });
    if (error) {
      toast.error("Upload failed");
      return;
    }
    const { data } = supabase.storage.from(UPLOAD_BUCKETS.portfolios).getPublicUrl(path);
    try {
      await updateStudio(studio.id, kind === "logo" ? { logo_url: data.publicUrl } : { cover_url: data.publicUrl });
      setStudio({ ...studio, [kind === "logo" ? "logo_url" : "cover_url"]: data.publicUrl });
      toast.success(kind === "logo" ? "Logo updated" : "Cover updated");
    } catch {
      toast.error("Could not save the image");
    }
  };

  const sendInvite = async () => {
    if (!studio || !user) return;
    try {
      await inviteToStudio({
        studioId: studio.id,
        username: inviteUsername,
        role: inviteRole,
        title: inviteTitle,
        invitedBy: user.id,
      });
      setInviteUsername("");
      setInviteTitle("");
      toast.success("Invitation sent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the invitation");
    }
  };

  const addEquipment = async () => {
    if (!studio || !user) return;
    if (!newItem.name.trim()) {
      toast.error("Name the piece of gear");
      return;
    }
    try {
      await upsertStudioEquipment(studio.id, { ...newItem, name: newItem.name.trim() }, user.id);
      setNewItem({ name: "", category: "", brand: "", model: "", quantity: 1 });
      const refreshed = await fetchStudioEquipmentForMember(studio.id);
      setEquipment(refreshed);
      setGearDone(refreshed.length < EQUIPMENT_PAGE_SIZE);
      toast.success("Gear added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add that gear");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!studio || !role) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">You don't have access to this studio</h1>
        <p className="mt-2 text-muted-foreground">Ask an owner or admin to invite you.</p>
        <Button asChild className="mt-6">
          <Link to="/studios">Browse studios</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarImage src={studio.logo_url ?? undefined} alt="" />
            <AvatarFallback>{studio.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              {studio.name}
              {studio.is_verified && <BadgeCheck className="h-5 w-5 text-primary" />}
            </h1>
            <p className="text-sm text-muted-foreground">
              @{studio.handle} · You are {STUDIO_ROLE_LABELS[role]}
            </p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link to={`/studios/${studio.handle}`}>
            View public page
            <ExternalLink className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="profile" className="mt-8">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="gear">Gear</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Brand</CardTitle>
              <CardDescription>Logo and cover shown on your public studio page.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-6">
              {(["logo", "cover"] as const).map((kind) => (
                <div key={kind} className="space-y-2">
                  <Label htmlFor={`studio-${kind}`} className="capitalize">
                    {kind}
                  </Label>
                  <Input
                    id={`studio-${kind}`}
                    type="file"
                    accept={UPLOAD_RULES.image.accept}
                    disabled={!canManageStudio}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadBrandMedia(file, kind);
                    }}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Studio details</CardTitle>
              <CardDescription>
                {canManageStudio ? "Only owners and admins can edit these." : "Read-only for your role."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="m-name">Name</Label>
                <Input
                  id="m-name"
                  value={form.name}
                  disabled={!canManageStudio}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-tagline">Tagline</Label>
                <Input
                  id="m-tagline"
                  value={form.tagline}
                  disabled={!canManageStudio}
                  onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-bio">About</Label>
                <Textarea
                  id="m-bio"
                  rows={5}
                  value={form.bio}
                  disabled={!canManageStudio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="m-city">City</Label>
                  <Input
                    id="m-city"
                    value={form.primary_city}
                    disabled={!canManageStudio}
                    onChange={(e) => setForm({ ...form, primary_city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="m-country">Country</Label>
                  <Input
                    id="m-country"
                    value={form.primary_country}
                    disabled={!canManageStudio}
                    onChange={(e) => setForm({ ...form, primary_country: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-email">Booking email</Label>
                <Input
                  id="m-email"
                  type="email"
                  value={form.contact_email}
                  disabled={!canManageStudio}
                  onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Facilities</Label>
                <div className="flex flex-wrap gap-2">
                  {STUDIO_FACILITIES.map((facility) => (
                    <Badge
                      key={facility}
                      variant={form.facilities.includes(facility) ? "default" : "outline"}
                      className={canManageStudio ? "cursor-pointer" : "opacity-70"}
                      onClick={() =>
                        canManageStudio &&
                        setForm({
                          ...form,
                          facilities: form.facilities.includes(facility)
                            ? form.facilities.filter((f) => f !== facility)
                            : [...form.facilities, facility],
                        })
                      }
                    >
                      {facility}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Publicly listed</p>
                  <p className="text-sm text-muted-foreground">
                    Off keeps the studio visible to members only and out of search.
                  </p>
                </div>
                <Switch
                  checked={form.visibility === "public"}
                  disabled={!canManageStudio}
                  onCheckedChange={(v) => setForm({ ...form, visibility: v ? "public" : "private" })}
                />
              </div>
              {canManageStudio && (
                <Button onClick={saveProfile} disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              )}
            </CardContent>
          </Card>

          {can(role, "request_verification", lifecycle) && !studio.is_verified && (
            <Card>
              <CardHeader>
                <CardTitle>Verification</CardTitle>
                <CardDescription>Request a verified badge for this studio.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (!user) return;
                    try {
                      await requestStudioVerification(studio, user.id);
                      toast.success("Verification requested — our team will review it");
                    } catch {
                      toast.error("Could not submit the request");
                    }
                  }}
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Request verification
                </Button>
              </CardContent>
            </Card>
          )}

          {isOwner && (
            <Card>
              <CardHeader>
                <CardTitle>Ownership &amp; status</CardTitle>
                <CardDescription>Only you, as the owner, can change these.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Studio active</p>
                    <p className="text-sm text-muted-foreground">
                      Turning this off hides the studio everywhere. Nothing is deleted — team, gear and work stay put.
                    </p>
                  </div>
                  <Switch
                    checked={studio.is_active}
                    onCheckedChange={async (v) => {
                      try {
                        await setStudioActive(studio.id, v);
                        setStudio({ ...studio, is_active: v });
                        toast.success(v ? "Studio is live again" : "Studio deactivated");
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Could not update the status");
                      }
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Transfer ownership</Label>
                  <p className="text-sm text-muted-foreground">
                    Hand the studio to an active member. You'll stay on as an admin.
                  </p>
                  <Select
                    value={transferTo}
                    onValueChange={async (v) => {
                      setTransferTo(v);
                      try {
                        await transferStudioOwnership(studio.id, v);
                        setStudio({ ...studio, owner_id: v });
                        setRole("admin");
                        await loadRoster(studio.id);
                        toast.success("Ownership transferred");
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Could not transfer ownership");
                      } finally {
                        setTransferTo("");
                      }
                    }}
                  >
                    <SelectTrigger className="sm:w-80">
                      <SelectValue placeholder="Choose a member" />
                    </SelectTrigger>
                    <SelectContent>
                      {roster
                        .filter((m) => m.status === "active" && m.user_id !== user?.id)
                        .map((m) => (
                          <SelectItem key={m.user_id} value={m.user_id}>
                            {profiles[m.user_id]?.full_name ??
                              profiles[m.user_id]?.username ??
                              STUDIO_ROLE_LABELS[m.role]}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="team" className="mt-6 space-y-6">
          {canManageMembers && (
            <Card>
              <CardHeader>
                <CardTitle>Invite a creator</CardTitle>
                <CardDescription>They'll get an in-app invitation to accept or decline.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="inv-username">Username</Label>
                    <Input
                      id="inv-username"
                      value={inviteUsername}
                      onChange={(e) => setInviteUsername(e.target.value)}
                      placeholder="@username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as StudioRole)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STUDIO_ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inv-title">Title (optional)</Label>
                    <Input
                      id="inv-title"
                      value={inviteTitle}
                      onChange={(e) => setInviteTitle(e.target.value)}
                      placeholder="Head engineer"
                    />
                  </div>
                </div>
                <Button onClick={sendInvite}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Send invitation
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Team ({roster.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {roster.map((member) => {
                const profile = profiles[member.user_id];
                return (
                  <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
                        <AvatarFallback>{profile?.full_name?.charAt(0) ?? "?"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{profile?.full_name ?? profile?.username ?? "Member"}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.title || STUDIO_ROLE_LABELS[member.role]}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {canManageMembers && member.role !== "owner" ? (
                        <>
                          <Select
                            value={member.role}
                            onValueChange={async (v) => {
                              try {
                                await updateStudioMemberRole(member.id, v as StudioRole);
                                setRoster((prev) =>
                                  prev.map((r) => (r.id === member.id ? { ...r, role: v as StudioRole } : r)),
                                );
                                toast.success("Role updated");
                              } catch {
                                toast.error("Could not update the role");
                              }
                            }}
                          >
                            <SelectTrigger className="w-44">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STUDIO_ROLES.map((r) => (
                                <SelectItem key={r.value} value={r.value}>
                                  {r.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label="Remove member"
                            onClick={async () => {
                              try {
                                await removeStudioMember(member.id);
                                setRoster((prev) => prev.filter((r) => r.id !== member.id));
                                toast.success("Member removed");
                              } catch {
                                toast.error("Could not remove the member");
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </>
                      ) : (
                        <Badge variant="secondary">{STUDIO_ROLE_LABELS[member.role]}</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gear" className="mt-6 space-y-6">
          {canManageGear && (
            <Card>
              <CardHeader>
                <CardTitle>Add gear</CardTitle>
                <CardDescription>Your gear list appears on the public studio page.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="gear-name">Name</Label>
                    <Input
                      id="gear-name"
                      value={newItem.name}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      placeholder="Neumann U87"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gear-category">Category</Label>
                    <Input
                      id="gear-category"
                      value={newItem.category}
                      onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                      placeholder="Microphones"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gear-brand">Brand</Label>
                    <Input
                      id="gear-brand"
                      value={newItem.brand}
                      onChange={(e) => setNewItem({ ...newItem, brand: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gear-quantity">Quantity</Label>
                    <Input
                      id="gear-quantity"
                      type="number"
                      min={1}
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) || 1 })}
                    />
                  </div>
                </div>
                <Button onClick={addEquipment}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add gear
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Gear list ({equipment.length}{gearDone ? "" : "+"})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {equipment.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing listed yet.</p>
              ) : (
                equipment.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div>
                      <p className="font-medium">
                        {item.name}
                        {item.quantity > 1 && <span className="text-muted-foreground"> ×{item.quantity}</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[item.brand, item.model, item.category].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    {can(role, "delete_equipment", lifecycle) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Remove ${item.name}`}
                        onClick={async () => {
                          try {
                            await deleteStudioEquipment(item.id);
                            setEquipment((prev) => prev.filter((e) => e.id !== item.id));
                          } catch {
                            toast.error("Could not remove that gear");
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                ))
              )}
              {!gearDone && (
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={gearLoadingMore}
                  onClick={async () => {
                    setGearLoadingMore(true);
                    const next = await fetchStudioEquipmentForMember(studio.id, { offset: equipment.length });
                    setEquipment((prev) => [...prev, ...next]);
                    setGearDone(next.length < EQUIPMENT_PAGE_SIZE);
                    setGearLoadingMore(false);
                  }}
                >
                  {gearLoadingMore ? "Loading…" : "Load more gear"}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudioManage;