import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type VerificationLevel =
  | "standard"
  | "identity_verified"
  | "studio_verified"
  | "entity_verified";

export type Capability =
  | "studio_create"
  | "studio_verification"
  | "talent_scouting"
  | "payouts"
  | "copyright_claim"
  | "entity_representation";

export type CapabilityState = {
  capability: string;
  required_level: string;
  my_level: string;
  allowed: boolean;
};

export const LEVEL_LABELS: Record<string, string> = {
  standard: "Standard account",
  identity_verified: "Identity verified",
  studio_verified: "Studio verified",
  entity_verified: "Entity verified",
};

export const CAPABILITY_LABELS: Record<string, string> = {
  studio_create: "Create a studio",
  studio_verification: "Studio verification badge",
  talent_scouting: "Talent scouting",
  payouts: "Marketplace payouts",
  copyright_claim: "File copyright claims",
  entity_representation: "Represent a company or label",
};

/** Every capability requirement resolved for the signed-in member. */
export const fetchMyCapabilities = async (): Promise<CapabilityState[]> => {
  const { data, error } = await supabase.rpc("my_capabilities");
  if (error) return [];
  return (data ?? []) as CapabilityState[];
};

/** Server-side check for one capability — mirrors meets_verification(). */
export const meetsCapability = async (capability: Capability): Promise<boolean> => {
  const all = await fetchMyCapabilities();
  return all.find((c) => c.capability === capability)?.allowed ?? false;
};

/** Trigger a verification review for a capability the member cannot use yet. */
export const requestCapabilityVerification = async (capability: Capability, notes?: string) => {
  const { error } = await supabase.rpc("request_capability_verification", {
    _capability: capability,
    _notes: notes ?? undefined,
  });
  return error;
};

/**
 * Reusable capability hook. `allowed` is decided by the database, so the UI
 * can only ever be more restrictive than the server, never less.
 */
export function useCapability(capability: Capability) {
  const [state, setState] = useState<CapabilityState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const all = await fetchMyCapabilities();
    setState(all.find((c) => c.capability === capability) ?? null);
    setLoading(false);
  }, [capability]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    loading,
    allowed: state?.allowed ?? false,
    requiredLevel: (state?.required_level ?? "standard") as VerificationLevel,
    myLevel: (state?.my_level ?? "standard") as VerificationLevel,
    requiresVerification: !!state && !state.allowed,
    refresh,
  };
}