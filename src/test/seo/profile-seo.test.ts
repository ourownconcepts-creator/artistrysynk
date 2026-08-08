import { describe, it, expect } from "vitest";
import { buildProfileHead, type SeoProfile } from "@/lib/profileSeo";

const get = (meta: Record<string, string>[], key: "name" | "property", value: string) =>
  meta.find((m) => m[key] === value)?.["content"];

const profiles: [string, string, SeoProfile][] = [
  [
    "uuid slug, full data",
    "11111111-1111-1111-1111-111111111111",
    {
      full_name: "Ada Synk",
      username: "adasynk",
      bio: "Producer and sound designer building cinematic afro-electronic worlds.",
      location: "Lagos, Nigeria",
      avatar_url: "https://cdn.artistrysynk.app/a.jpg",
      cover_image_url: "https://cdn.artistrysynk.app/c.jpg",
      roles: ["producer", "sound_engineer"],
    },
  ],
  [
    "username slug, no bio or cover",
    "leo-visuals",
    {
      full_name: "Leo Visuals",
      username: "leo-visuals",
      bio: null,
      location: "Berlin",
      avatar_url: "https://cdn.artistrysynk.app/leo.jpg",
      cover_image_url: null,
      roles: ["videographer"],
    },
  ],
  [
    "no roles, insecure image",
    "22222222-2222-2222-2222-222222222222",
    {
      full_name: "Nia K",
      username: "",
      bio: null,
      location: null,
      avatar_url: "http://insecure.example.com/n.jpg",
      cover_image_url: null,
      roles: null,
    },
  ],
];

describe("SEO: public profile head tags", () => {
  it.each(profiles)("renders complete metadata for %s", (_label, slug, profile) => {
    const head = buildProfileHead(profile, slug);
    const meta = head.meta;

    const title = meta.find((m) => m["title"])?.["title"];
    expect(title).toContain(profile.full_name);
    expect(title).toMatch(/ArtistrySynk$/);
    expect(title!.length).toBeGreaterThan(10);

    const description = get(meta, "name", "description");
    expect(description).toBeTruthy();
    expect(description!.length).toBeLessThanOrEqual(200);

    // Open Graph
    expect(get(meta, "property", "og:title")).toBe(title);
    expect(get(meta, "property", "og:description")).toBe(description);
    expect(get(meta, "property", "og:type")).toBe("profile");
    expect(get(meta, "property", "og:site_name")).toBe("ArtistrySynk");

    // Twitter card
    expect(get(meta, "name", "twitter:card")).toBe("summary_large_image");
    expect(get(meta, "name", "twitter:title")).toBe(title);
    expect(get(meta, "name", "twitter:description")).toBe(description);

    // Canonical self-references the profile and matches og:url
    const expectedUrl = `https://artistrysynk.app/profile/${profile.username || slug}`;
    expect(head.links?.[0]).toEqual({ rel: "canonical", href: expectedUrl });
    expect(get(meta, "property", "og:url")).toBe(expectedUrl);

    // JSON-LD
    const script = head.scripts?.[0];
    expect(script?.type).toBe("application/ld+json");
    const ld = JSON.parse(script!.children);
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("ProfilePage");
    expect(ld.mainEntity["@type"]).toBe("Person");
    expect(ld.mainEntity.name).toBe(profile.full_name);
    expect(ld.mainEntity.url).toBe(expectedUrl);
  });

  it("uses https images only, preferring the cover image", () => {
    const [, slugA, withCover] = profiles[0]!;
    const headA = buildProfileHead(withCover, slugA);
    expect(get(headA.meta, "property", "og:image")).toBe(withCover.cover_image_url);
    expect(get(headA.meta, "name", "twitter:image")).toBe(withCover.cover_image_url);

    const [, slugB, avatarOnly] = profiles[1]!;
    const headB = buildProfileHead(avatarOnly, slugB);
    expect(get(headB.meta, "property", "og:image")).toBe(avatarOnly.avatar_url);

    const [, slugC, insecure] = profiles[2]!;
    const headC = buildProfileHead(insecure, slugC);
    expect(get(headC.meta, "property", "og:image")).toBeUndefined();
    expect(get(headC.meta, "name", "twitter:image")).toBeUndefined();
  });

  it("emits a safe fallback head when the profile is missing", () => {
    const head = buildProfileHead(null, "unknown-user");
    expect(head.meta.find((m) => m["title"])?.["title"]).toBe("Creative profile — ArtistrySynk");
    expect(get(head.meta, "property", "og:type")).toBe("profile");
    expect(get(head.meta, "name", "twitter:card")).toBe("summary_large_image");
    // No canonical or JSON-LD for a page that does not resolve.
    expect(head.links).toBeUndefined();
    expect(head.scripts).toBeUndefined();
  });

  it("produces distinct metadata per userId", () => {
    const titles = profiles.map(([, slug, p]) =>
      buildProfileHead(p, slug).meta.find((m) => m["title"])?.["title"],
    );
    expect(new Set(titles).size).toBe(titles.length);
  });
});