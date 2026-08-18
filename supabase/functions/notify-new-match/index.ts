import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0';

/** QueenSMTP REST sender. */
class QueenSMTP {
  constructor(private key?: string) {}
  emails = {
    send: async (a: { from: string; to: string | string[]; subject: string; html?: string; text?: string; reply_to?: string }) => {
      if (!this.key) throw new Error("Email service not configured");
      const to = (Array.isArray(a.to) ? a.to : [a.to]).map((t) => t.trim()).filter(Boolean);
      const text = a.text ?? (a.html ?? "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim();
      const m = a.from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
      const fromEmail = (m ? m[2] : a.from).trim();
      const fromName = (m ? m[1].replace(/^"|"$/g, "").trim() : "") || "ArtistrySynk";
      let last = "";
      for (let i = 0; i < 3; i++) {
        if (i) await new Promise((r) => setTimeout(r, 400 * 2 ** (i - 1)));
        try {
          const res = await fetch("https://queensmtp.com/v1/send", {
            method: "POST",
            headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ from: fromEmail, fromName, from_name: fromName, to, subject: a.subject, html: a.html, text, ...(a.reply_to ? { reply_to: a.reply_to } : {}) }),
          });
          const b = (await res.json().catch(() => null)) as { id?: string; success?: boolean; error?: string } | null;
          if (res.ok && b?.success !== false) return { id: b?.id };
          last = b?.error ?? `QueenSMTP failed (${res.status})`;
          if (res.status !== 429 && res.status < 500) break;
        } catch (e) {
          last = e instanceof Error ? e.message : "network error";
        }
      }
      throw new Error(last || "Email send failed");
    },
  };
}

const resend = new QueenSMTP(Deno.env.get("QUEENSMTP_API_KEY"));
const LOGO_URL = "https://lihctrhzsyjqnlzwwkzo.supabase.co/storage/v1/object/public/email-assets/logo.png";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const brandedHeader = `
  <div style="text-align: center; padding: 30px 0 20px 0; background: linear-gradient(135deg, #c026d3 0%, #7c3aed 50%, #f97316 100%); border-radius: 12px 12px 0 0;">
    <img src="${LOGO_URL}" alt="ArtistrySynk" style="height: 80px; width: auto;" />
  </div>
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { matchId } = await req.json();

    const { data: match } = await supabase
      .from('matches')
      .select(`
        *,
        user1:profiles!matches_user_id_1_fkey(full_name, username),
        user2:profiles!matches_user_id_2_fkey(full_name, username)
      `)
      .eq('id', matchId)
      .single();

    if (!match) {
      throw new Error('Match not found');
    }

    const { data: superAdmins } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'super_admin');

    if (!superAdmins || superAdmins.length === 0) {
      console.log('No super admins found');
      return new Response(
        JSON.stringify({ message: 'No super admins to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    for (const admin of superAdmins) {
      const { data: { user } } = await supabase.auth.admin.getUserById(admin.user_id);
      
      if (user?.email) {
        await resend.emails.send({
          from: 'Admin Notifications <notifications@artistrysynk.app>',
          to: [user.email],
          subject: 'New Match Created',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              ${brandedHeader}
              <div style="padding: 30px;">
                <h1>New Match Created</h1>
                <p>A new match has been created on the platform:</p>
                <ul>
                  <li><strong>User 1:</strong> ${match.user1.full_name} (@${match.user1.username})</li>
                  <li><strong>User 2:</strong> ${match.user2.full_name} (@${match.user2.username})</li>
                  <li><strong>Matched at:</strong> ${new Date(match.matched_at).toLocaleString()}</li>
                </ul>
                <p>This match is now active and users can start communicating.</p>
                <hr style="margin: 20px 0; border: none; border-top: 1px solid #E5E7EB;" />
                <p style="color: #6B7280; font-size: 12px;">The ArtistrySynk Team</p>
              </div>
            </div>
          `,
        });

        await supabase
          .from('admin_notifications')
          .insert({
            recipient_admin_id: admin.user_id,
            notification_type: 'new_match',
            title: 'New Match Created',
            message: `${match.user1.full_name} and ${match.user2.full_name} matched`,
            action_data: { match_id: matchId },
          });
      }
    }

    return new Response(
      JSON.stringify({ message: 'Notifications sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('Error sending match notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
