import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0';
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Fetch match details
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

    // Fetch super admin emails
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

    // Send notification to super admins
    for (const admin of superAdmins) {
      const { data: { user } } = await supabase.auth.admin.getUserById(admin.user_id);
      
      if (user?.email) {
        await resend.emails.send({
          from: 'Admin Notifications <onboarding@resend.dev>',
          to: [user.email],
          subject: 'New Match Created',
          html: `
            <h1>New Match Created</h1>
            <p>A new match has been created on the platform:</p>
            <ul>
              <li><strong>User 1:</strong> ${match.user1.full_name} (@${match.user1.username})</li>
              <li><strong>User 2:</strong> ${match.user2.full_name} (@${match.user2.username})</li>
              <li><strong>Matched at:</strong> ${new Date(match.matched_at).toLocaleString()}</li>
            </ul>
            <p>This match is now active and users can start communicating.</p>
          `,
        });

        // Create in-app notification
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
