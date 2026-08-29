import { supabase } from "@/integrations/supabase/client";

export interface MyLocation {
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  country: string | null;
  location: string | null;
}

/**
 * Reads the signed-in user's own saved location.
 *
 * `profiles.latitude` / `profiles.longitude` are no longer readable through the
 * Data API (precise coordinates must not leak to discovery viewers), so own
 * coordinates come from the `get_my_location` RPC instead.
 */
export async function fetchMyLocation(): Promise<MyLocation | null> {
  const { data, error } = await (supabase.rpc as any)("get_my_location");
  if (error) return null;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as MyLocation) ?? null;
}
