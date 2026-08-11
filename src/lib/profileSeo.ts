import { ogImageMeta } from "./ogImage";
import { getRoleLabel } from "@/lib/creativeRoles";

export const PROFILE_SEO_BASE = "https://artistrysynk.app";

export type SeoProfile = {
  full_name: string;
  username: string;
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  roles: string[] | null;
};

export type HeadMeta = Record<string, string>;
export type HeadOutput = {
  meta: HeadMeta[];
  links?: { rel: string; href: string }[];
  scripts?: { type: string; children: string }[];
};

const FALLBACK_TITLE = "Creative profile — ArtistrySynk";
const FALLBACK_DESCRIPTION =
  "Discover creative professionals and collaborate on ArtistrySynk.";

/**
 * Pure head-tag builder for public profile pages.
 * Kept free of router imports so SEO output is directly testable.
 */
export function buildProfileHead(
  profile: SeoProfile | null | undefined,
  slug: string,
): HeadOutput {
  if (!profile) {
    return {
      meta: [
        { title: FALLBACK_TITLE },
        { name: "description", content: FALLBACK_DESCRIPTION },
        { property: "og:title", content: FALLBACK_TITLE },
        { property: "og:description", content: FALLBACK_DESCRIPTION },
        { property: "og:type", content: "profile" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  }

  const roleLabels = (profile.roles ?? []).map((r) => getRoleLabel(r));
  const title = `${profile.full_name} (@${profile.username})${
    roleLabels[0] ? ` — ${roleLabels[0]}` : ""
  } | ArtistrySynk`;
  const description = (
    profile.bio?.slice(0, 155) ||
    `${profile.full_name}${roleLabels.length ? ` — ${roleLabels.join(", ")}` : ""}${
      profile.location ? ` based in ${profile.location}` : ""
    }. See portfolio highlights and collaborate on ArtistrySynk.`
  ).trim();
  const url = `${PROFILE_SEO_BASE}/profile/${profile.username || slug}`;
  const image = profile.cover_image_url || profile.avatar_url;

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "profile" },
      { property: "og:url", content: url },
      { property: "og:site_name", content: "ArtistrySynk" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      ...ogImageMeta(image, title, { path: new URL(url).pathname }),
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          mainEntity: {
            "@type": "Person",
            name: profile.full_name,
            alternateName: profile.username,
            description: profile.bio ?? undefined,
            image: profile.avatar_url ?? undefined,
            jobTitle: roleLabels.length ? roleLabels.join(", ") : undefined,
            url,
          },
        }),
      },
    ],
  };
}