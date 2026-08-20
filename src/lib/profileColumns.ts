/**
 * Explicit column list for `profiles` reads.
 *
 * `profiles.email` is no longer granted to client roles (emails are only
 * available to admins through the `get_profile_emails` RPC), so `select("*")`
 * would be rejected. Use this list instead.
 */
export const PROFILE_COLUMNS =
  "id, full_name, username, bio, location, avatar_url, cover_image_url, social_links, is_verified, created_at, updated_at, is_featured, featured_until, synergy_boost_score, is_hidden, looking_for, country, city, latitude, longitude, last_seen_at, nickname, display_name, display_name_mode, username_changed_at, professional_verified, professional_verified_at";
