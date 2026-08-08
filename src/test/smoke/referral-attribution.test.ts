import { describe, it, expect, beforeEach, vi } from "vitest";
import { state, supabaseMock, setUser } from "@/test/mocks/supabase";

vi.mock("@/integrations/supabase/client", () => ({ supabase: supabaseMock }));

import {
  storeReferralCode,
  getStoredReferralCode,
  clearReferralCode,
  claimStoredReferral,
} from "@/lib/referral";

/** Simulate landing on an invite URL, e.g. /auth?ref=SYNK123. */
function visitWithRef(code: string) {
  const url = new URL(`https://artistrysynk.app/auth?ref=${encodeURIComponent(code)}`);
  storeReferralCode(url.searchParams.get("ref"));
}

/** Simulate the post-signup hook that every provider funnels through. */
async function completeSignup(provider: "email" | "google" | "apple", userId = "new-user") {
  // Email signs in on the same page; Google/Apple bounce through an OAuth
  // redirect, so only localStorage survives — assert it does.
  if (provider !== "email") {
    expect(getStoredReferralCode()).not.toBe("");
  }
  setUser(userId);
  return claimStoredReferral();
}

describe("smoke: referral attribution across auth providers", () => {
  beforeEach(() => {
    localStorage.clear();
    clearReferralCode();
    setUser("new-user");
    state.rpc = {};
    supabaseMock.rpc.mockClear();
  });

  it("stores the ?ref= code and trims whitespace", () => {
    visitWithRef("  SYNK123  ");
    expect(getStoredReferralCode()).toBe("SYNK123");
  });

  it.each(["email", "google", "apple"] as const)(
    "attributes the stored code after %s signup",
    async (provider) => {
      visitWithRef("SYNK123");
      state.rpc = { claim_referral: "attributed" };

      const result = await completeSignup(provider);

      expect(result).toBe("attributed");
      expect(supabaseMock.rpc).toHaveBeenCalledWith("claim_referral", { _code: "SYNK123" });
      // Code is consumed so a later session cannot re-claim it.
      expect(getStoredReferralCode()).toBe("");
    },
  );

  it("does not call the server when no code was stored", async () => {
    const result = await claimStoredReferral();
    expect(result).toBe("no_code");
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it("clears the code on self-referral and invalid codes", async () => {
    for (const outcome of ["self_referral", "invalid_code", "already_attributed"] as const) {
      visitWithRef("SYNK123");
      state.rpc = { claim_referral: outcome };
      expect(await claimStoredReferral()).toBe(outcome);
      expect(getStoredReferralCode()).toBe("");
    }
  });

  it("keeps the code when the user is not authenticated yet", async () => {
    visitWithRef("SYNK123");
    state.rpc = { claim_referral: "unauthenticated" };
    expect(await claimStoredReferral()).toBe("unauthenticated");
    // Still pending, so the OAuth callback can retry once the session lands.
    expect(getStoredReferralCode()).toBe("SYNK123");
  });

  it("is idempotent when the callback and auth listener both fire", async () => {
    visitWithRef("SYNK123");
    state.rpc = { claim_referral: "attributed" };
    const [first, second] = await Promise.all([claimStoredReferral(), claimStoredReferral()]);
    expect(first).toBe("attributed");
    expect(second).toBe("attributed");
    expect(getStoredReferralCode()).toBe("");
  });
});