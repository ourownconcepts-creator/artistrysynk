import { supabase } from "@/integrations/supabase/client";

export type VisibilityMode = "public" | "discoverable" | "private" | "invisible";
export type DisplayNameMode =
  | "full_name"
  | "nickname"
  | "username"
  | "full_and_nickname"
  | "custom";

export const VISIBILITY_MODES: {
  value: VisibilityMode;
  label: string;
  help: string;
}[] = [
  {
    value: "public",
    label: "Public",
    help: "Anyone, including search engines, can find your profile page.",
  },
  {
    value: "discoverable",
    label: "Discoverable",
    help: "Only signed-in members can find you. Your page stays out of search engines.",
  },
  {
    value: "private",
    label: "Private",
    help: "Only people you already work with — matches, projects, studios and your trusted circle.",
  },
  {
    value: "invisible",
    label: "Invisible",
    help: "You disappear from every surface. Only your trusted circle can see you.",
  },
];

export const AUDIENCE_OPTIONS = [
  { value: "everyone", label: "Everyone" },
  { value: "members", label: "Signed-in members" },
  { value: "verified", label: "Verified people only" },
  { value: "studios", label: "Studios and agencies" },
  { value: "connections", label: "People I work with" },
  { value: "matches", label: "My matches" },
  { value: "trusted", label: "My trusted circle" },
  { value: "nobody", label: "Nobody" },
];

export const OPPORTUNITY_TYPES = [
  { value: "collaboration", label: "Collaborations" },
  { value: "paid_work", label: "Paid work" },
  { value: "session_work", label: "Session work" },
  { value: "casting", label: "Casting calls" },
  { value: "signing", label: "Label / management signing" },
  { value: "employment", label: "Employment" },
  { value: "mentorship", label: "Mentorship" },
];

export type VisibilityControls = {
  visibility_mode: VisibilityMode;
  who_can_discover: string;
  who_can_match: string;
  who_can_contact: string;
  who_can_scout: string;
  who_can_introduce: string;
  open_to_opportunities: boolean;
  opportunity_types: string[];
  allow_search_indexing: boolean;
  anonymous_talent_profile: boolean;
  discoverable_in_discovery: boolean;
  discoverable_in_search: boolean;
  discoverable_in_recommendations: boolean;
};

export const VISIBILITY_DEFAULTS: VisibilityControls = {
  visibility_mode: "public",
  who_can_discover: "everyone",
  who_can_match: "everyone",
  who_can_contact: "matches",
  who_can_scout: "verified",
  who_can_introduce: "trusted",
  open_to_opportunities: false,
  opportunity_types: [],
  allow_search_indexing: true,
  anonymous_talent_profile: false,
};

export const VISIBILITY_COLUMNS =
  "visibility_mode, who_can_discover, who_can_match, who_can_contact, who_can_scout, who_can_introduce, open_to_opportunities, opportunity_types, allow_search_indexing, anonymous_talent_profile";

/** Persist a single visibility control for the signed-in member. */
export const saveVisibilityControl = async (
  userId: string,
  key: keyof VisibilityControls,
  value: VisibilityControls[keyof VisibilityControls],
) => {
  const { error } = await supabase
    .from("user_settings")
    .upsert(
      { user_id: userId, [key]: value, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  return error;
};

export type TrustedRelationship = {
  id: string;
  user_id: string;
  related_user_id: string;
  kind: string;
  status: string;
  source: string;
  introduced_by: string | null;
  message: string | null;
  created_at: string;
};

/** Requests waiting on me, plus the circle I already approved. */
export const fetchTrustedCircle = async (userId: string) => {
  const { data } = await supabase
    .from("trusted_relationships")
    .select("*")
    .or(`user_id.eq.${userId},related_user_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as TrustedRelationship[];
  return {
    incoming: rows.filter((r) => r.user_id === userId && r.status === "pending"),
    outgoing: rows.filter((r) => r.related_user_id === userId && r.status === "pending"),
    accepted: rows.filter((r) => r.status === "accepted"),
  };
};

export const respondToTrust = async (id: string, status: "accepted" | "declined" | "revoked") => {
  // Goes through the RPC so the decision is checked and the requester notified.
  const { error } = await supabase.rpc("respond_to_trust_request", { _id: id, _status: status });
  return error;
};

/**
 * Introduce someone from your trusted circle to another member. The database
 * verifies you are actually trusted by them and that their settings allow
 * introductions from you.
 */
export const createTrustedIntroduction = async (
  subjectUserId: string,
  recipientUserId: string,
  message?: string,
) => {
  const { error } = await supabase.rpc("create_trusted_introduction", {
    _subject: subjectUserId,
    _recipient: recipientUserId,
    _message: message ?? undefined,
  });
  return error;
};

/** Ask someone to add me to their trusted circle. */
export const requestTrust = async (targetUserId: string, kind = "connection", message?: string) => {
  const { error } = await supabase.from("trusted_relationships").insert({
    user_id: targetUserId,
    related_user_id: (await supabase.auth.getUser()).data.user?.id ?? "",
    kind,
    source: "direct",
    status: "pending",
    message: message ?? null,
  });
  return error;
};