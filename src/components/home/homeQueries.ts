import { supabase } from "@/integrations/supabase/client";

export type HomeSnapshot = {
  unreadMessages: number;
  pendingRequests: number;
  newLikes: number;
  matches: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    last_seen_at: string | null;
  }[];
};

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

export function isOnline(lastSeen?: string | null) {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < ONLINE_WINDOW_MS;
}

export async function fetchHomeSnapshot(userId: string): Promise<HomeSnapshot> {
  const [unread, requests, likes, matchRows] = await Promise.all([
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("read", false)
      .neq("sender_id", userId),
    supabase
      .from("collaboration_requests")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", userId)
      .eq("status", "pending"),
    supabase
      .from("swipes")
      .select("id", { count: "exact", head: true })
      .eq("swiped_id", userId)
      .eq("liked", true),
    supabase
      .from("matches")
      .select("id, user_id_1, user_id_2")
      .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
      .order("matched_at", { ascending: false })
      .limit(12),
  ]);

  const otherIds = (matchRows.data ?? []).map((m) =>
    m.user_id_1 === userId ? m.user_id_2 : m.user_id_1,
  );

  let matches: HomeSnapshot["matches"] = [];
  if (otherIds.length) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, last_seen_at")
      .in("id", otherIds);
    matches = (data ?? []) as HomeSnapshot["matches"];
  }

  return {
    unreadMessages: unread.count ?? 0,
    pendingRequests: requests.count ?? 0,
    newLikes: likes.count ?? 0,
    matches,
  };
}

export async function fetchTrendingPosts() {
  const { data } = await supabase
    .from("collaboration_posts")
    .select("id, content, hashtags, role_tags, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(6);
  if (!data?.length) return [];
  const { data: authors } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, is_verified")
    .in("id", data.map((p) => p.user_id));
  const byId = new Map((authors ?? []).map((a) => [a.id, a]));
  return data.map((post) => ({ ...post, author: byId.get(post.user_id) ?? null }));
}

export async function fetchOpportunities() {
  const { data } = await supabase
    .from("job_postings")
    .select("id, title, location, job_type, budget_range, required_roles, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(6);
  return data ?? [];
}

export async function fetchOpenProjects() {
  const { data } = await supabase
    .from("projects")
    .select("id, title, description, project_category, looking_for, budget, created_at")
    .eq("is_public", true)
    .eq("is_open", true)
    .order("created_at", { ascending: false })
    .limit(6);
  return data ?? [];
}

export async function fetchNearby(userId: string) {
  const { data: me } = await supabase
    .from("profiles")
    .select("latitude, longitude, city")
    .eq("id", userId)
    .maybeSingle();

  if (me?.latitude != null && me?.longitude != null) {
    const { data } = await supabase.rpc("get_nearby_creators", {
      _user_id: userId,
      _lat: me.latitude,
      _lng: me.longitude,
      _radius_km: 150,
      _limit: 10,
    });
    if (data?.length) return data;
  }

  const { data: fallback } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, city, country, location, is_verified, bio")
    .neq("id", userId)
    .order("last_seen_at", { ascending: false, nullsFirst: false })
    .limit(10);
  return (fallback ?? []).map((p) => ({ ...p, distance_km: null }));
}

export async function fetchRecentSignups(userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, is_verified, created_at")
    .neq("id", userId)
    .order("created_at", { ascending: false })
    .limit(12);
  return data ?? [];
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 22) return "Good evening";
  return "Late night session";
}