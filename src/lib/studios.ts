/**
 * Studio Ecosystem V1 — shared client helpers.
 *
 * Public reads go through the anon-callable `*_studio*` RPCs so studio pages are
 * crawlable. Everything member-scoped goes through the Data API where studio RLS
 * and `has_studio_capability` are the real boundary; the capability mirror below
 * only decides which controls to render.
 */
import { supabase } from "@/integrations/supabase/client";
import { UPLOAD_BUCKETS } from "@/config/uploads";

export type StudioOrgType = "studio" | "agency" | "label" | "production_company" | "collective";

export type StudioRole =
  | "owner"
  | "admin"
  | "manager"
  | "staff"
  | "booking_manager"
  | "finance_manager"
  | "contributor";

export type StudioCapability =
  | "manage_studio"
  | "manage_members"
  | "manage_equipment"
  | "delete_equipment"
  | "manage_portfolio"
  | "delete_portfolio"
  | "request_verification"
  | "view_analytics"
  | "delete_studio";

export const STUDIO_ORG_TYPES: { value: StudioOrgType; label: string }[] = [
  { value: "studio", label: "Studio" },
  { value: "agency", label: "Agency" },
  { value: "label", label: "Label" },
  { value: "production_company", label: "Production company" },
  { value: "collective", label: "Collective" },
];

export const STUDIO_ROLES: { value: StudioRole; label: string; hint: string }[] = [
  { value: "admin", label: "Admin", hint: "Full control except deleting the studio" },
  { value: "manager", label: "Manager", hint: "Manage gear, portfolio and see analytics" },
  { value: "staff", label: "Staff", hint: "Add gear and portfolio work" },
  { value: "booking_manager", label: "Booking manager", hint: "Handles bookings and enquiries" },
  { value: "finance_manager", label: "Finance manager", hint: "Handles payouts and invoices" },
  { value: "contributor", label: "Contributor", hint: "Add portfolio work only" },
];

export const STUDIO_ROLE_LABELS: Record<StudioRole, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  staff: "Staff",
  booking_manager: "Booking manager",
  finance_manager: "Finance manager",
  contributor: "Contributor",
};

/** Mirrors public.has_studio_capability — presentation only, never a security boundary. */
const CAPABILITY_ROLES: Record<StudioCapability, StudioRole[]> = {
  manage_studio: ["owner", "admin"],
  manage_members: ["owner", "admin"],
  manage_equipment: ["owner", "admin", "manager", "staff"],
  delete_equipment: ["owner", "admin", "manager"],
  manage_portfolio: ["owner", "admin", "manager", "staff", "contributor"],
  delete_portfolio: ["owner", "admin", "manager"],
  request_verification: ["owner", "admin"],
  view_analytics: ["owner", "admin", "manager"],
  delete_studio: ["owner"],
};

export function can(role: StudioRole | null | undefined, capability: StudioCapability): boolean {
  return !!role && CAPABILITY_ROLES[capability].includes(role);
}

export const STUDIO_FACILITIES = [
  "Recording booth",
  "Mixing room",
  "Mastering",
  "Live room",
  "Rehearsal space",
  "Photo studio",
  "Video stage",
  "Green screen",
  "Editing suite",
  "Podcast setup",
  "Lounge",
  "Parking",
] as const;

export const EQUIPMENT_CATEGORIES = [
  "Microphones",
  "Monitors",
  "Interfaces",
  "Instruments",
  "Outboard",
  "Cameras",
  "Lenses",
  "Lighting",
  "Computers",
  "Other",
] as const;

/* ------------------------------- handles ------------------------------- */

export function normalizeHandle(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 30);
}

export function handleError(handle: string): string | null {
  if (handle.length < 3) return "Use at least 3 characters";
  if (handle.length > 30) return "Use at most 30 characters";
  if (!/^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])$/.test(handle))
    return "Use lowercase letters, numbers, dashes or underscores";
  return null;
}

export async function isHandleAvailable(handle: string): Promise<boolean> {
  const { data } = await supabase.rpc("get_public_studio", { _handle: handle });
  if ((data as unknown[] | null)?.length) return false;
  const { count } = await supabase
    .from("studios")
    .select("id", { count: "exact", head: true })
    .ilike("handle", handle);
  return (count ?? 0) === 0;
}

/* ------------------------------ public reads ------------------------------ */

export type PublicStudio = {
  id: string;
  handle: string;
  name: string;
  org_type: string;
  tagline: string | null;
  bio: string | null;
  logo_url: string | null;
  cover_url: string | null;
  primary_city: string | null;
  primary_country: string | null;
  latitude: number | null;
  longitude: number | null;
  contact_email: string | null;
  social_links: Record<string, string> | null;
  facilities: string[];
  is_verified: boolean;
  created_at: string;
  member_count: number;
};

export type StudioCard = Pick<
  PublicStudio,
  | "id"
  | "handle"
  | "name"
  | "org_type"
  | "tagline"
  | "logo_url"
  | "cover_url"
  | "primary_city"
  | "primary_country"
  | "facilities"
  | "is_verified"
  | "created_at"
>;

export type StudioTeamMember = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  role: string;
  title: string | null;
  creative_roles: string[] | null;
};

export type StudioEquipment = {
  id: string;
  name: string;
  category: string | null;
  brand: string | null;
  model: string | null;
  description: string | null;
  photo_url: string | null;
  quantity: number;
  is_available: boolean;
};

export type StudioPortfolioItem = {
  id: string;
  title: string;
  description: string | null;
  media_type: string;
  media_url: string;
  thumbnail_url: string | null;
  created_at: string;
};

export async function fetchPublicStudio(handle: string): Promise<PublicStudio | null> {
  const { data } = await supabase.rpc("get_public_studio", { _handle: handle });
  return ((data as PublicStudio[] | null)?.[0] ?? null) as PublicStudio | null;
}

export async function fetchPublicStudios(filters: {
  city?: string | null;
  orgType?: string | null;
  search?: string | null;
  limit?: number;
  offset?: number;
}): Promise<StudioCard[]> {
  const { data } = await supabase.rpc("list_public_studios", {
    _city: filters.city || undefined,
    _org_type: filters.orgType && filters.orgType !== "all" ? filters.orgType : undefined,
    _search: filters.search || undefined,
    _limit: filters.limit ?? 24,
    _offset: filters.offset ?? 0,
  });
  return (data as StudioCard[] | null) ?? [];
}

export async function fetchStudioTeam(studioId: string): Promise<StudioTeamMember[]> {
  const { data } = await supabase.rpc("list_studio_public_team", { _studio_id: studioId, _limit: 50 });
  return (data as StudioTeamMember[] | null) ?? [];
}

export async function fetchStudioEquipment(studioId: string): Promise<StudioEquipment[]> {
  const { data } = await supabase.rpc("list_studio_public_equipment", { _studio_id: studioId, _limit: 100 });
  return (data as StudioEquipment[] | null) ?? [];
}

export async function fetchStudioPortfolio(studioId: string): Promise<StudioPortfolioItem[]> {
  const { data } = await supabase.rpc("list_studio_public_portfolio", { _studio_id: studioId, _limit: 24 });
  return (data as StudioPortfolioItem[] | null) ?? [];
}

/* ----------------------------- member surfaces ----------------------------- */

export type MyStudio = {
  role: StudioRole;
  studio: {
    id: string;
    handle: string;
    name: string;
    org_type: string;
    tagline: string | null;
    logo_url: string | null;
    primary_city: string | null;
    is_verified: boolean;
    is_active: boolean;
    visibility: string;
  };
};

export async function fetchMyStudios(userId: string): Promise<MyStudio[]> {
  const { data } = await supabase
    .from("studio_members")
    .select(
      "role, studios!inner(id, handle, name, org_type, tagline, logo_url, primary_city, is_verified, is_active, visibility)",
    )
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  return ((data ?? []) as unknown as { role: StudioRole; studios: MyStudio["studio"] }[]).map((row) => ({
    role: row.role,
    studio: row.studios,
  }));
}

export type StudioInvite = {
  id: string;
  studio_id: string;
  role: StudioRole;
  title: string | null;
  message: string | null;
  status: string;
  created_at: string;
  invited_user_id: string;
  studios: { handle: string; name: string; logo_url: string | null } | null;
};

export async function fetchMyStudioInvites(userId: string): Promise<StudioInvite[]> {
  const { data } = await supabase
    .from("studio_invites")
    .select("id, studio_id, role, title, message, status, created_at, invited_user_id, studios(handle, name, logo_url)")
    .eq("invited_user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as StudioInvite[];
}

export async function respondToStudioInvite(inviteId: string, accept: boolean) {
  const { error } = await supabase
    .from("studio_invites")
    .update({ status: accept ? "accepted" : "declined" })
    .eq("id", inviteId);
  if (error) throw error;
}

export type StudioRosterRow = {
  id: string;
  user_id: string;
  role: StudioRole;
  title: string | null;
  status: string;
  created_at: string;
};

export async function fetchStudioRoster(studioId: string): Promise<StudioRosterRow[]> {
  const { data } = await supabase
    .from("studio_members")
    .select("id, user_id, role, title, status, created_at")
    .eq("studio_id", studioId)
    .order("created_at", { ascending: true });
  return (data ?? []) as StudioRosterRow[];
}

export async function inviteToStudio(input: {
  studioId: string;
  username: string;
  role: StudioRole;
  title?: string;
  message?: string;
  invitedBy: string;
}) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", input.username.replace(/^@/, ""))
    .maybeSingle();
  if (!profile) throw new Error("No creator found with that username");

  const { error } = await supabase.from("studio_invites").insert({
    studio_id: input.studioId,
    invited_user_id: profile.id,
    invited_by: input.invitedBy,
    role: input.role,
    title: input.title || null,
    message: input.message || null,
  });
  if (error) throw error;
}

export async function removeStudioMember(memberRowId: string) {
  const { error } = await supabase.from("studio_members").delete().eq("id", memberRowId);
  if (error) throw error;
}

export async function updateStudioMemberRole(memberRowId: string, role: StudioRole) {
  const { error } = await supabase.from("studio_members").update({ role }).eq("id", memberRowId);
  if (error) throw error;
}

export async function requestStudioVerification(studio: { id: string; handle: string; name: string }, userId: string) {
  const { error } = await supabase.from("verification_requests").insert({
    user_id: userId,
    request_type: "studio",
    verification_data: { studio_id: studio.id, studio_handle: studio.handle, studio_name: studio.name },
  });
  if (error) throw error;
}

/* ------------------------------ studio writes ------------------------------ */

/**
 * Creation runs through a server function: the owner is derived from the session,
 * entitlement is checked server-side and the owner membership is created atomically.
 */
export async function createStudio(input: {
  handle: string;
  name: string;
  orgType: StudioOrgType;
  tagline?: string;
  bio?: string;
  city?: string;
  country?: string;
  contactEmail?: string;
  facilities?: string[];
}) {
  const { createStudioFn } = await import("./studios.functions");
  return createStudioFn({
    data: {
      handle: input.handle,
      name: input.name,
      orgType: input.orgType,
      tagline: input.tagline,
      bio: input.bio,
      city: input.city,
      country: input.country,
      contactEmail: input.contactEmail,
      facilities: input.facilities ?? [],
    },
  });
}

/** Owner-only, enforced by `transfer_studio_ownership`. */
export async function transferStudioOwnership(studioId: string, newOwnerId: string) {
  const { transferStudioOwnershipFn } = await import("./studios.functions");
  await transferStudioOwnershipFn({ data: { studioId, newOwnerId } });
}

/** Owner-only, enforced by `set_studio_active`. Deactivation deletes nothing. */
export async function setStudioActive(studioId: string, active: boolean) {
  const { setStudioActiveFn } = await import("./studios.functions");
  await setStudioActiveFn({ data: { studioId, active } });
}

export type StudioRecord = PublicStudio & {
  is_active: boolean;
  is_hidden: boolean;
  visibility: string;
  owner_id: string;
};

export async function fetchStudioForMember(handle: string) {
  const { data, error } = await supabase
    .from("studios")
    .select("*")
    .ilike("handle", handle)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as StudioRecord | null;
}

export async function updateStudio(studioId: string, patch: Record<string, unknown>) {
  const { error } = await supabase.from("studios").update(patch).eq("id", studioId);
  if (error) throw error;
}

export async function upsertStudioEquipment(
  studioId: string,
  item: Partial<StudioEquipment> & { name: string },
  createdBy: string,
) {
  const payload = {
    studio_id: studioId,
    name: item.name,
    category: item.category || null,
    brand: item.brand || null,
    model: item.model || null,
    description: item.description || null,
    quantity: item.quantity && item.quantity > 0 ? item.quantity : 1,
    is_available: item.is_available ?? true,
  };
  if (item.id) {
    const { error } = await supabase.from("studio_equipment").update(payload).eq("id", item.id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("studio_equipment").insert({ ...payload, created_by: createdBy });
  if (error) throw error;
}

export async function deleteStudioEquipment(id: string) {
  const { error } = await supabase.from("studio_equipment").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchStudioEquipmentForMember(studioId: string): Promise<StudioEquipment[]> {
  const { data } = await supabase
    .from("studio_equipment")
    .select("id, name, category, brand, model, description, photo_url, quantity, is_available")
    .eq("studio_id", studioId)
    .order("created_at", { ascending: false });
  return (data ?? []) as StudioEquipment[];
}

/* --------------------------------- follows --------------------------------- */

export async function isFollowingStudio(studioId: string, userId: string) {
  const { count } = await supabase
    .from("studio_follows")
    .select("id", { count: "exact", head: true })
    .eq("studio_id", studioId)
    .eq("user_id", userId)
    .eq("kind", "follow");
  return (count ?? 0) > 0;
}

export async function toggleStudioFollow(studioId: string, userId: string, following: boolean) {
  if (following) {
    const { error } = await supabase
      .from("studio_follows")
      .delete()
      .eq("studio_id", studioId)
      .eq("user_id", userId)
      .eq("kind", "follow");
    if (error) throw error;
    return false;
  }
  const { error } = await supabase
    .from("studio_follows")
    .insert({ studio_id: studioId, user_id: userId, kind: "follow" });
  if (error) throw error;
  return true;
}

/* --------------------------------- storage --------------------------------- */

/** Shared studio media path enforced by storage RLS: studios/{studioId}/... */
export function studioMediaPath(studioId: string, kind: "logo" | "cover" | "equipment" | "work", ext: string) {
  return `studios/${studioId}/${kind}/${crypto.randomUUID()}.${ext}`;
}

/** Bucket that holds studio brand + work media. */
export const STUDIO_MEDIA_BUCKET = UPLOAD_BUCKETS.portfolios;