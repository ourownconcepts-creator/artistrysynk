import { describe, it, expect } from "vitest";
import { emailSchema, passwordSchema, usernameSchema } from "@/lib/authValidation";

describe("smoke: signup validation", () => {
  it("accepts a compliant signup payload", () => {
    expect(emailSchema.safeParse("creative@artistrysynk.app").success).toBe(true);
    expect(passwordSchema.safeParse("Synk!2026").success).toBe(true);
    expect(usernameSchema.safeParse("synk_creative").success).toBe(true);
  });

  it.each([
    ["short", "Ab!2345"],
    ["no uppercase", "synk!2026"],
    ["no lowercase", "SYNK!2026"],
    ["no number", "SynkSynk!"],
    ["no special char", "SynkSynk2026"],
  ])("rejects password: %s", (_label, password) => {
    expect(passwordSchema.safeParse(password).success).toBe(false);
  });

  it("rejects malformed emails and usernames", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
    expect(usernameSchema.safeParse("ab").success).toBe(false);
    expect(usernameSchema.safeParse("bad name!").success).toBe(false);
  });
});
