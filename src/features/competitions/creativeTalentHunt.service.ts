import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type CompetitionDatabase = {
  public: {
    Tables: {
      competition_competitions: {
        Row: { id: string; slug: string; name: string; domain: string; type: string; status: string; description: string };
        Insert: { slug: string; name: string; domain?: string; type?: string; status?: string; description?: string; config?: Json };
        Update: Partial<CompetitionDatabase["public"]["Tables"]["competition_competitions"]["Insert"]>;
        Relationships: [];
      };
      competition_categories: {
        Row: { id: string; competition_id: string; name: string; slug: string; sort_order: number; is_active: boolean };
        Insert: { competition_id: string; name: string; slug: string; sort_order?: number; is_active?: boolean };
        Update: Partial<CompetitionDatabase["public"]["Tables"]["competition_categories"]["Insert"]>;
        Relationships: [];
      };
      competition_rounds: {
        Row: { id: string; competition_id: string; name: string; slug: string; sequence: number };
        Insert: { competition_id: string; name: string; slug: string; sequence?: number; round_type?: string };
        Update: Partial<CompetitionDatabase["public"]["Tables"]["competition_rounds"]["Insert"]>;
        Relationships: [];
      };
      competition_applications: {
        Row: {
          id: string; competition_id: string; category_id: string; current_round_id: string | null; user_id: string;
          handle: string; display_name: string; full_name: string; email: string; phone: string; location: string;
          date_of_birth: string | null; bio: string; experience: string; audition_url: string; audition_notes: string;
          submission_answers: Json; progress_state: string; submission_state: string; status: string; reference_code: string | null;
          submitted_at: string | null; is_public: boolean; media_is_public: boolean; review_decision: string | null; review_reason: string | null;
        };
        Insert: {
          competition_id: string; category_id: string; current_round_id?: string | null; user_id: string; handle: string; display_name: string;
          full_name?: string; email?: string; phone?: string; location?: string; bio?: string; experience?: string; audition_url?: string;
          audition_notes?: string; submission_answers?: Json; progress_state?: string; submission_state?: string; status?: string; is_public?: boolean; media_is_public?: boolean;
        };
        Update: Partial<CompetitionDatabase["public"]["Tables"]["competition_applications"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_public_creative_talent_hunt_entries: {
        Args: Record<string, never>;
        Returns: Array<{
          id: string;
          handle: string;
          display_name: string;
          location: string;
          bio: string;
          audition_url: string;
          status: string;
          category_id: string;
          category_name: string;
        }>;
      };
      review_creative_talent_hunt_application: {
        Args: { p_application_id: string; p_decision: string; p_reason?: string };
        Returns: {
          application_id: string;
          decision: string;
          status: string;
          reason: string;
        };
      };
      submit_creative_talent_hunt_application: {
        Args: { p_application_id: string; p_publish_publicly?: boolean };
        Returns: {
          application_id: string;
          submission_id: string;
          reference_code: string;
          submission_state: string;
          status: string;
          is_public: boolean;
        };
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const competitionClient = supabase as unknown as SupabaseClient<CompetitionDatabase>;

export type TalentHuntApplication = CompetitionDatabase["public"]["Tables"]["competition_applications"]["Row"];

const COMPETITION_SLUG = "creative-talent-hunt";

export async function getCreativeTalentHuntApplication(userId: string) {
  const { data, error } = await competitionClient
    .from("competition_applications")
    .select("*")
    .eq("competition_id", await getCompetitionId())
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getCompetitionId() {
  const { data, error } = await competitionClient
    .from("competition_competitions")
    .select("id")
    .eq("slug", COMPETITION_SLUG)
    .single();

  if (error) throw error;
  return data.id;
}

export async function ensureCreativeTalentHuntApplication(userId: string, categorySlug: string) {
  const competitionId = await getCompetitionId();

  const { data: category, error: categoryError } = await competitionClient
    .from("competition_categories")
    .select("id, name")
    .eq("competition_id", competitionId)
    .eq("slug", categorySlug)
    .eq("is_active", true)
    .single();

  if (categoryError) throw categoryError;

  const existing = await getCreativeTalentHuntApplication(userId);
  if (existing) return existing;

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  const metadata = user?.user_metadata ?? {};
  const baseHandle = String(metadata.username || metadata.user_name || user?.email?.split("@")[0] || "creator")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24) || "creator";
  const displayName = String(metadata.full_name || metadata.name || baseHandle);

  const { data, error } = await competitionClient
    .from("competition_applications")
    .insert({
      competition_id: competitionId,
      category_id: category.id,
      user_id: userId,
      handle: baseHandle,
      display_name: displayName,
      full_name: displayName,
      email: user?.email || "",
      progress_state: "PROFILE",
      submission_state: "DRAFT",
      status: "DRAFT",
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      const existingAfterRace = await getCreativeTalentHuntApplication(userId);
      if (existingAfterRace) return existingAfterRace;
    }
    throw error;
  }

  return data;
}

export async function updateCreativeTalentHuntApplication(
  applicationId: string,
  userId: string,
  values: {
    display_name: string;
    handle: string;
    location: string;
    bio: string;
    experience: string;
    audition_url: string;
    audition_notes: string;
  },
) {
  const handle = values.handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 32);
  if (!handle) throw new Error("Choose a valid creator handle.");
  if (!values.display_name.trim()) throw new Error("Display name is required.");

  const { data, error } = await competitionClient
    .from("competition_applications")
    .update({
      display_name: values.display_name.trim(),
      handle,
      location: values.location.trim(),
      bio: values.bio.trim(),
      experience: values.experience.trim(),
      audition_url: values.audition_url.trim(),
      audition_notes: values.audition_notes.trim(),
      progress_state: values.audition_url.trim() ? "AUDITION" : "PROFILE",
    })
    .eq("id", applicationId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}


export async function submitCreativeTalentHuntApplication(
  applicationId: string,
  publishPublicly: boolean,
) {
  const { data, error } = await competitionClient.rpc(
    "submit_creative_talent_hunt_application",
    {
      p_application_id: applicationId,
      p_publish_publicly: publishPublicly,
    },
  );

  if (error) throw error;
  return data;
}

export async function listPublicCreativeTalentHuntEntries() {
  const { data, error } = await competitionClient.rpc(
    "get_public_creative_talent_hunt_entries",
    {},
  );

  if (error) throw error;
  return data ?? [];
}

export async function listCreativeTalentHuntReviewQueue() {
  const competitionId = await getCompetitionId();
  const { data, error } = await competitionClient
    .from("competition_applications")
    .select("*")
    .eq("competition_id", competitionId)
    .in("status", ["PENDING_REVIEW", "REJECTED"])
    .order("submitted_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function reviewCreativeTalentHuntApplication(
  applicationId: string,
  decision: "APPROVE" | "REJECT",
  reason: string,
) {
  const { data, error } = await competitionClient.rpc(
    "review_creative_talent_hunt_application",
    {
      p_application_id: applicationId,
      p_decision: decision,
      p_reason: reason,
    },
  );

  if (error) throw error;
  return data;
}


export async function castCreativeTalentHuntVote(applicationId: string) {
  const { data, error } = await supabase.rpc("cast_creative_talent_hunt_vote", { p_application_id: applicationId });
  if (error) throw error;
  return data;
}
