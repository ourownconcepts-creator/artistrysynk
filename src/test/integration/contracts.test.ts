import { describe, expect, it } from "vitest";
import {
  approvedProfileProjection,
  createIntentSchema,
  hasRequiredScopes,
  isExactRedirectMatch,
  isIntentUsable,
  redirectUriSchema,
  sanitizeAuditMetadata,
} from "@/lib/integration/contracts";

describe("integration v1 security contracts", () => {
  it("requires every requested scope", () => {
    expect(hasRequiredScopes(["identity:read"], ["identity:read"])).toBe(true);
    expect(hasRequiredScopes(["identity:read"], ["profile:read"])).toBe(false);
  });

  it("accepts exact registered redirects only", () => {
    const registered = ["https://partner.example/callback"];
    expect(
      isExactRedirectMatch("https://partner.example/callback", registered),
    ).toBe(true);
    expect(
      isExactRedirectMatch("https://partner.example/callback/", registered),
    ).toBe(false);
    expect(
      isExactRedirectMatch(
        "https://partner.example/callback?next=evil",
        registered,
      ),
    ).toBe(false);
  });

  it("rejects insecure and fragment redirects", () => {
    expect(
      redirectUriSchema.safeParse("http://partner.example/callback").success,
    ).toBe(false);
    expect(
      redirectUriSchema.safeParse("https://partner.example/callback#token")
        .success,
    ).toBe(false);
    expect(
      redirectUriSchema.safeParse("http://localhost:3000/callback").success,
    ).toBe(true);
  });

  it("rejects unknown scopes and malformed requests", () => {
    expect(
      createIntentSchema.safeParse({
        external_subject: "zgt-1",
        redirect_uri: "https://partner.example/callback",
        scopes: ["admin"],
      }).success,
    ).toBe(false);
  });

  it("treats intents as single-use and expiring", () => {
    const now = new Date("2026-09-11T13:00:00Z");
    expect(isIntentUsable("pending", "2026-09-11T13:01:00Z", now)).toBe(true);
    expect(isIntentUsable("completed", "2026-09-11T13:01:00Z", now)).toBe(
      false,
    );
    expect(isIntentUsable("pending", "2026-09-11T12:59:00Z", now)).toBe(false);
  });

  it("removes credentials from audit metadata", () => {
    expect(
      sanitizeAuditMetadata({
        intent_id: "safe",
        access_token: "no",
        clientSecret: "no",
        reason: "safe",
      }),
    ).toEqual({ intent_id: "safe", reason: "safe" });
  });

  it("returns only approved profile fields", () => {
    const output = approvedProfileProjection({
      id: "1",
      username: "artist",
      full_name: "Artist",
      email: "private@example.com",
      latitude: 1,
      bio: "Hi",
    });
    expect(output).toMatchObject({
      id: "1",
      username: "artist",
      display_name: "Artist",
      bio: "Hi",
    });
    expect(output).not.toHaveProperty("email");
    expect(output).not.toHaveProperty("latitude");
  });
});
