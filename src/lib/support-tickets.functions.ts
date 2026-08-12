import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SupportTicket = {
  id: string;
  referenceId: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  adminResponse: string | null;
  respondedAt: string | null;
  createdAt: string;
};

/** The signed-in user's own contact/support requests and any replies. */
export const listMySupportTickets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SupportTicket[]> => {
    const { data } = await context.supabase
      .from("contact_submissions")
      .select(
        "id, reference_id, subject, message, category, status, admin_response, responded_at, created_at",
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);

    return (data ?? []).map((row) => ({
      id: row.id,
      referenceId: row.reference_id ?? "—",
      subject: row.subject,
      message: row.message,
      category: row.category ?? "support",
      status: row.status ?? "pending",
      adminResponse: row.admin_response,
      respondedAt: row.responded_at,
      createdAt: row.created_at,
    }));
  });
