import { supabase } from "@/integrations/supabase/client";

const KEY = "as_referral_code";

/** Persist a ?ref= code so it survives OAuth redirects and page reloads. */
export function storeReferralCode(code: string | null | undefined) {
  if (!code || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, code.trim());
  } catch {
    /* storage unavailable */
  }
}

export function getStoredReferralCode(): string {
  if (typeof localStorage === "undefined") return "";
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function clearReferralCode() {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

export type ClaimResult =
  | "attributed"
  | "already_attributed"
  | "invalid_code"
  | "self_referral"
  | "no_code"
  | "unauthenticated"
  | "error";

/**
 * Attribute the stored referral code to the signed-in user.
 * Safe to call repeatedly — the server refuses duplicates and self-referrals.
 */
export async function claimStoredReferral(): Promise<ClaimResult> {
  const code = getStoredReferralCode();
  if (!code) return "no_code";

  const { data, error } = await supabase.rpc("claim_referral", { _code: code });
  if (error) return "error";

  const result = (data as ClaimResult) ?? "error";
  if (result !== "error" && result !== "unauthenticated") clearReferralCode();
  return result;
}