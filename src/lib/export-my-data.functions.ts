import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DataExport = {
  exportedAt: string;
  userId: string;
  /** Pretty-printed JSON of every exported table. */
  json: string;
  mediaUrls: string[];
};

/** Full copy of the signed-in user's profile, activity and media links. */
export const exportMyData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DataExport> => {
    const supabase = context.supabase;
    const userId = context.userId;

    const pick = async (table: string, column: string) => {
      const { data } = await (supabase.from(table as never) as never as {
        select: (q: string) => {
          eq: (c: string, v: string) => Promise<{ data: unknown[] | null }>;
        };
      })
        .select("*")
        .eq(column, userId);
      return data ?? [];
    };

    const [
      profile,
      settings,
      roles,
      genres,
      skills,
      portfolio,
      projects,
      memberships,
      collabPosts,
      notifications,
      referrals,
      sessions,
      studioMemberships,
      ownedStudios,
    ] = await Promise.all([
      pick("profiles", "id"),
      pick("user_settings", "user_id"),
      pick("user_creative_roles", "user_id"),
      pick("user_genres", "user_id"),
      pick("user_skill_tags", "user_id"),
      pick("portfolio_items", "user_id"),
      pick("projects", "created_by"),
      pick("project_members", "user_id"),
      pick("collaboration_posts", "user_id"),
      pick("user_notifications", "user_id"),
      pick("referrals", "referrer_id"),
      pick("user_sessions", "user_id"),
      pick("studio_members", "user_id"),
      pick("studios", "owner_id"),
    ]);

    const mediaUrls = new Set<string>();
    const collect = (rows: unknown[], keys: string[]) => {
      for (const row of rows) {
        for (const key of keys) {
          const value = (row as Record<string, unknown>)[key];
          if (typeof value === "string" && /^https?:\/\//.test(value)) mediaUrls.add(value);
        }
      }
    };
    collect(profile, ["avatar_url", "cover_image_url"]);
    collect(portfolio, ["media_url", "thumbnail_url"]);

    const exportedAt = new Date().toISOString();

    return {
      exportedAt,
      userId,
      json: JSON.stringify(
        {
          exported_at: exportedAt,
          user_id: userId,
          profile,
          settings,
          creative_roles: roles,
          genres,
          skills,
          portfolio_items: portfolio,
          projects,
          project_memberships: memberships,
          collaboration_posts: collabPosts,
          notifications,
          referrals,
          sessions,
          studio_memberships: studioMemberships,
          owned_studios: ownedStudios,
          media_urls: [...mediaUrls],
        },
        null,
        2,
      ),
      mediaUrls: [...mediaUrls],
    };
  });