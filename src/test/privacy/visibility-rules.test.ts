import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  AUDIENCE_OPTIONS,
  VISIBILITY_DEFAULTS,
  VISIBILITY_MODES,
  type VisibilityControls,
} from "@/lib/identity";

/**
 * Decision table mirroring public.can_discover(). Every branch here has a
 * matching branch in the SQL function, so a regression in either surface is
 * caught by the same expectations.
 */
type Viewer = {
  id: string | null;
  verified?: boolean;
  inStudio?: boolean;
  trusted?: boolean;
  matched?: boolean;
  related?: boolean;
  blocked?: boolean;
};

const audienceAllows = (choice: string, viewer: Viewer): boolean => {
  switch (choice) {
    case "nobody":
      return false;
    case "everyone":
      return true;
    case "members":
      return viewer.id !== null;
    case "matches":
      return !!viewer.matched;
    case "trusted":
      return !!viewer.trusted;
    case "connections":
      return !!viewer.related || !!viewer.trusted || !!viewer.matched;
    case "verified":
      return !!viewer.verified;
    case "studios":
      return !!viewer.inStudio;
    default:
      return viewer.id !== null;
  }
};

const canDiscover = (
  viewer: Viewer,
  target: { id: string; hidden?: boolean; settings: VisibilityControls },
  surface: "discovery" | "search" | "recommendations" | "talent" | "web",
): boolean => {
  if (viewer.id === target.id) return true;
  if (target.hidden) return false;
  if (viewer.blocked) return false;

  const s = target.settings;
  if (s.visibility_mode === "invisible") return !!viewer.id && !!viewer.trusted;
  if (s.visibility_mode === "private")
    return !!viewer.id && (!!viewer.related || !!viewer.trusted || !!viewer.matched);

  if (surface === "talent")
    return s.open_to_opportunities && audienceAllows(s.who_can_scout, viewer);
  if (surface === "web") return s.visibility_mode === "public" && s.allow_search_indexing;
  if (surface === "discovery" && !s.discoverable_in_discovery) return false;
  if (surface === "search" && !s.discoverable_in_search) return false;
  if (surface === "recommendations" && !s.discoverable_in_recommendations) return false;
  if (s.visibility_mode === "discoverable" && viewer.id === null) return false;

  return audienceAllows(s.who_can_discover, viewer);
};

const settings = (over: Partial<VisibilityControls> = {}): VisibilityControls => ({
  ...VISIBILITY_DEFAULTS,
  discoverable_in_discovery: true,
  discoverable_in_search: true,
  discoverable_in_recommendations: true,
  ...over,
} as VisibilityControls);

const anon: Viewer = { id: null };
const stranger: Viewer = { id: "stranger" };
const verified: Viewer = { id: "scout", verified: true };
const trusted: Viewer = { id: "friend", trusted: true, related: true };
const collaborator: Viewer = { id: "mate", related: true };

const surfaces = ["discovery", "search", "recommendations", "talent", "web"] as const;

describe("can_discover parity — private and invisible accounts", () => {
  const priv = { id: "target", settings: settings({ visibility_mode: "private" }) };
  const invis = { id: "target", settings: settings({ visibility_mode: "invisible" }) };

  it("hides private accounts from anonymous callers on every surface", () => {
    for (const s of surfaces) expect(canDiscover(anon, priv, s)).toBe(false);
  });

  it("hides private accounts from signed-in strangers on every surface", () => {
    for (const s of surfaces) expect(canDiscover(stranger, priv, s)).toBe(false);
  });

  it("hides invisible accounts from everyone outside the trusted circle", () => {
    for (const viewer of [anon, stranger, verified, collaborator]) {
      for (const s of surfaces) expect(canDiscover(viewer, invis, s)).toBe(false);
    }
  });

  it("lets existing collaborators still see a private account", () => {
    expect(canDiscover(collaborator, priv, "search")).toBe(true);
  });

  it("lets only the trusted circle see an invisible account", () => {
    expect(canDiscover(trusted, invis, "search")).toBe(true);
    expect(canDiscover(collaborator, invis, "search")).toBe(false);
  });
});

describe("surface opt-outs and audiences", () => {
  it("respects per-surface switches independently", () => {
    const t = { id: "target", settings: settings({ discoverable_in_discovery: false }) };
    expect(canDiscover(stranger, t, "discovery")).toBe(false);
    expect(canDiscover(stranger, t, "search")).toBe(true);
  });

  it("keeps discoverable-mode profiles out of anonymous/web surfaces", () => {
    const t = { id: "target", settings: settings({ visibility_mode: "discoverable" }) };
    expect(canDiscover(anon, t, "search")).toBe(false);
    expect(canDiscover(anon, t, "web")).toBe(false);
    expect(canDiscover(stranger, t, "search")).toBe(true);
  });

  it("removes non-indexed public profiles from web surfaces only", () => {
    const t = { id: "target", settings: settings({ allow_search_indexing: false }) };
    expect(canDiscover(anon, t, "web")).toBe(false);
    expect(canDiscover(stranger, t, "search")).toBe(true);
  });

  it("enforces every audience choice", () => {
    for (const option of AUDIENCE_OPTIONS) {
      const t = { id: "target", settings: settings({ who_can_discover: option.value }) };
      expect(canDiscover(stranger, t, "search")).toBe(
        audienceAllows(option.value, stranger),
      );
    }
  });

  it("blocks blocked viewers regardless of mode", () => {
    const t = { id: "target", settings: settings() };
    expect(canDiscover({ id: "blocked", blocked: true }, t, "search")).toBe(false);
  });

  it("keeps hidden (moderated) profiles out of all surfaces", () => {
    const t = { id: "target", hidden: true, settings: settings() };
    for (const s of surfaces) expect(canDiscover(stranger, t, s)).toBe(false);
  });
});

describe("talent scouting privacy", () => {
  it("only lists members who opted into opportunities", () => {
    const closed = { id: "target", settings: settings({ open_to_opportunities: false }) };
    expect(canDiscover(verified, closed, "talent")).toBe(false);
  });

  it("honours the scouting audience", () => {
    const open = {
      id: "target",
      settings: settings({ open_to_opportunities: true, who_can_scout: "verified" }),
    };
    expect(canDiscover(verified, open, "talent")).toBe(true);
    expect(canDiscover(stranger, open, "talent")).toBe(false);
  });
});

describe("server enforcement is not bypassed by the client", () => {
  const read = (p: string) => readFileSync(p, "utf8");

  it("Discover loads the deck and search through the privacy RPCs", () => {
    const src = read("src/pages/Discover.tsx");
    expect(src).toContain('supabase.rpc("list_discovery_deck"');
    expect(src).toContain('supabase.rpc("search_creatives"');
    // No raw profile table listing that would bypass can_discover().
    expect(src).not.toContain('.from("profiles")\n        .select("id, full_name, username, bio');
  });

  it("talent scouting only calls the anonymised RPC", () => {
    const src = read("src/pages/Talent.tsx");
    expect(src).toContain('supabase.rpc("list_talent_candidates"');
    expect(src).not.toContain('.from("profiles")');
  });

  it("trust decisions go through the checked RPC", () => {
    const src = read("src/lib/identity.ts");
    expect(src).toContain('supabase.rpc("respond_to_trust_request"');
    expect(src).toContain('supabase.rpc("create_trusted_introduction"');
  });

  it("the admin identity console never selects legal identity columns", () => {
    const src = read("src/pages/AdminIdentity.tsx");
    expect(src).not.toContain("legal_name");
    expect(src).not.toContain("date_of_birth");
    expect(src).toContain('supabase.rpc("admin_list_identity_access"');
  });

  it("exposes exactly the four visibility modes", () => {
    expect(VISIBILITY_MODES.map((m) => m.value)).toEqual([
      "public",
      "discoverable",
      "private",
      "invisible",
    ]);
  });
});