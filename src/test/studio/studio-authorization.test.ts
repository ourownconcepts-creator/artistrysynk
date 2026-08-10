/**
 * Multi-user authorization matrix for studios. The client capability helper
 * mirrors the server `has_studio_capability`, so this locks the contract every
 * studio surface relies on: role is the ceiling, JSONB can only revoke, and
 * lifecycle gates management without trapping the owner.
 */
import { describe, expect, it } from "vitest";
import { can, STUDIO_ROLE_LABELS, type StudioRole } from "@/lib/studios";

const ROLES = Object.keys(STUDIO_ROLE_LABELS) as StudioRole[];

describe("studio authorization across members", () => {
  it("only the owner can delete or transfer the studio", () => {
    for (const role of ROLES) {
      expect(can(role, "delete_studio")).toBe(role === "owner");
    }
  });

  it("member management is limited to owner and admin", () => {
    for (const role of ROLES) {
      expect(can(role, "manage_members")).toBe(role === "owner" || role === "admin");
    }
  });

  it("a non-member has no capability at all", () => {
    for (const capability of [
      "manage_studio",
      "manage_members",
      "manage_equipment",
      "manage_portfolio",
      "view_analytics",
      "delete_studio",
    ] as const) {
      expect(can(null, capability)).toBe(false);
    }
  });

  it("no role can be widened through per-member permissions", () => {
    for (const role of ROLES) {
      if (role === "owner") continue;
      expect(can(role, "delete_studio", { permissions: { delete_studio: true } })).toBe(false);
    }
  });

  it("every role loses management while the studio is inactive", () => {
    for (const role of ROLES) {
      expect(can(role, "manage_studio", { studioActive: false })).toBe(false);
      expect(can(role, "manage_equipment", { studioActive: false })).toBe(false);
    }
    // The owner keeps the two capabilities needed to inspect and resolve it.
    expect(can("owner", "delete_studio", { studioActive: false })).toBe(true);
    expect(can("owner", "view_analytics", { studioActive: false })).toBe(true);
  });
});