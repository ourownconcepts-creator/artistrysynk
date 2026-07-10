import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0';
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
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

    const { actionType, adminId, targetUserId, details } = await req.json();

    const { data: { user: adminUser } } = await supabase.auth.admin.getUserById(adminId);
    
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('id', targetUserId)
      .single();

    const { data: higherAdmins } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['master_admin', 'super_admin'])
      .neq('user_id', adminId);

    if (!higherAdmins || higherAdmins.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No higher-level admins to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const criticalActions = ['delete_user', 'suspend_user', 'change_role', 'ban_user'];
    if (!criticalActions.includes(actionType)) {
      return new Response(
        JSON.stringify({ message: 'Action is not critical' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    for (const admin of higherAdmins) {
      const { data: { user } } = await supabase.auth.admin.getUserById(admin.user_id);
      
      if (user?.email) {
        await resend.emails.send({
          from: 'Admin Notifications <notifications@artistrysynk.app>',
          to: [user.email],
          subject: `Critical Admin Action: ${actionType}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              ${brandedHeader}
              <div style="padding: 30px;">
                <h1 style="color: #dc2626;">Critical Admin Action Alert</h1>
                <p>A critical action was performed that requires your attention:</p>
                <div style="background-color: #fef2f2; padding: 15px; border-left: 4px solid #dc2626; margin: 20px 0;">
                  <p><strong>Admin:</strong> ${adminUser?.email}</p>
                  <p><strong>Action:</strong> ${actionType}</p>
                  <p><strong>Target User:</strong> ${targetProfile?.full_name} (@${targetProfile?.username})</p>
                  ${details ? `<p><strong>Details:</strong> ${details}</p>` : ''}
                  <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                </div>
                <p>Please review this action in your admin dashboard.</p>
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
            sender_admin_id: adminId,
            notification_type: 'critical_action',
            title: `Critical Action: ${actionType}`,
            message: `${adminUser?.email} performed ${actionType} on ${targetProfile?.full_name}`,
            action_data: { action_type: actionType, target_user_id: targetUserId, details },
          });
      }
    }

    return new Response(
      JSON.stringify({ message: 'Critical action notifications sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('Error sending critical action notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
