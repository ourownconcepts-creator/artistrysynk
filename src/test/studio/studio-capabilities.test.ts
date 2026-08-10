import { describe, expect, it } from "vitest";
import { can } from "@/lib/studios";

describe("studio capability model", () => {
  it("role is the ceiling — permissions JSONB cannot widen it", () => {
    expect(can("admin", "delete_studio", { permissions: { delete_studio: true } })).toBe(false);
    expect(can("manager", "manage_members", { permissions: { manage_members: true } })).toBe(false);
    expect(can("staff", "manage_studio", { permissions: { manage_studio: true } })).toBe(false);
    expect(can("contributor", "manage_equipment", { permissions: { manage_equipment: true } })).toBe(false);
  });

  it("permissions JSONB may only revoke", () => {
    expect(can("admin", "manage_members")).toBe(true);
    expect(can("admin", "manage_members", { permissions: { manage_members: false } })).toBe(false);
    expect(can("admin", "manage_members", { permissions: { manage_members: "yes" } })).toBe(false);
  });

  it("owner keeps owner capabilities", () => {
    expect(can("owner", "delete_studio")).toBe(true);
    expect(can("owner", "manage_studio")).toBe(true);
  });

  it("a deactivated studio blocks normal management but not inspection or resolution", () => {
    const off = { studioActive: false };
    expect(can("owner", "manage_members", off)).toBe(false);
    expect(can("admin", "manage_equipment", off)).toBe(false);
    expect(can("owner", "delete_studio", off)).toBe(true);
    expect(can("owner", "view_analytics", off)).toBe(true);
  });

  it("no role means no capability", () => {
    expect(can(null, "manage_portfolio")).toBe(false);
  });
});

describe("studio service capabilities (V1.5-A)", () => {
  it("manage_services is limited to owner, admin and manager", () => {
    for (const role of ["owner", "admin", "manager"] as const) {
      expect(can(role, "manage_services")).toBe(true);
    }
    for (const role of ["staff", "booking_manager", "finance_manager", "contributor"] as const) {
      expect(can(role, "manage_services")).toBe(false);
    }
  });

  it("delete_services is limited to owner and admin", () => {
    expect(can("owner", "delete_services")).toBe(true);
    expect(can("admin", "delete_services")).toBe(true);
    expect(can("manager", "delete_services")).toBe(false);
  });

  it("service capabilities cannot be widened by permissions JSONB", () => {
    expect(can("staff", "manage_services", { permissions: { manage_services: true } })).toBe(false);
    expect(can("manager", "delete_services", { permissions: { delete_services: true } })).toBe(false);
  });

  it("a deactivated or downgraded studio blocks service management", () => {
    expect(can("owner", "manage_services", { studioActive: false })).toBe(false);
    expect(can("admin", "delete_services", { studioActive: false })).toBe(false);
  });

  it("a non-member has no service capability", () => {
    expect(can(null, "manage_services")).toBe(false);
    expect(can(null, "delete_services")).toBe(false);
  });
});
