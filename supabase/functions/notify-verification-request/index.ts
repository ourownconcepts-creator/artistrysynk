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

    const { verificationRequestId } = await req.json();

    const { data: verificationRequest } = await supabase
      .from('verification_requests')
      .select('*')
      .eq('id', verificationRequestId)
      .single();

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('id', verificationRequest?.user_id)
      .single();

    if (!verificationRequest) {
      throw new Error('Verification request not found');
    }

    const { data: admins } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'master_admin', 'super_admin']);

    if (!admins || admins.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No admins to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    for (const admin of admins) {
      const { data: { user } } = await supabase.auth.admin.getUserById(admin.user_id);
      
      if (user?.email) {
        await resend.emails.send({
          from: 'Admin Notifications <notifications@artistrysynk.app>',
          to: [user.email],
          subject: 'New Verification Request',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              ${brandedHeader}
              <div style="padding: 30px;">
                <h1>New Verification Request</h1>
                <p>A new verification request has been submitted:</p>
                <ul>
                  <li><strong>User:</strong> ${profile?.full_name || 'Unknown'} (@${profile?.username || 'unknown'})</li>
                  <li><strong>Type:</strong> ${verificationRequest?.request_type}</li>
                  <li><strong>Status:</strong> ${verificationRequest?.status}</li>
                  <li><strong>Submitted:</strong> ${new Date(verificationRequest?.created_at).toLocaleString()}</li>
                </ul>
                <p>Please review this request in the admin dashboard.</p>
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
            notification_type: 'verification_request',
            title: 'New Verification Request',
            message: `${profile?.full_name || 'A user'} submitted a ${verificationRequest?.request_type} verification request`,
            action_data: { verification_request_id: verificationRequestId },
          });
      }
    }

    return new Response(
      JSON.stringify({ message: 'Notifications sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('Error sending verification notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
