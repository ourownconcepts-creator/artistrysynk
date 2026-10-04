import { supabase } from "@/integrations/supabase/client";

// New tables may not be in generated types yet; keep access typed loosely here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = (table: "collaboration_proposals" | "availability_slots" | "booking_requests") => supabase.from(table as any) as any;

export interface Slot {
  id: string;
  user_id: string;
  starts_at: string;
  ends_at: string;
  note: string | null;
}

export const PROPOSAL_BUCKET = "proposal-files";
export const PROPOSAL_MAX_BYTES = 20 * 1024 * 1024;

const TIME = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });
const DAY = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });
export const fmtTime = (iso: string) => TIME.format(new Date(iso));
export const fmtDay = (iso: string) => DAY.format(new Date(iso));
export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
