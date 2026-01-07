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

    // Fetch analytics data
    const { data: profiles } = await supabase
      .from('profiles')
      .select('created_at');

    const { data: activityLogs } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const newUsers = profiles?.filter(p => 
      new Date(p.created_at) > lastWeek
    ).length || 0;

    const totalUsers = profiles?.length || 0;
    const recentActivity = activityLogs?.filter(a => 
      new Date(a.created_at) > lastWeek
    ).length || 0;

    // Fetch super admin emails
    const { data: superAdmins } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'super_admin');

    if (!superAdmins || superAdmins.length === 0) {
      console.log('No super admins found');
      return new Response(
        JSON.stringify({ message: 'No super admins to send report to' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // For each super admin, send the report
    for (const admin of superAdmins) {
      const { data: { user } } = await supabase.auth.admin.getUserById(admin.user_id);
      
      if (user?.email) {
        await resend.emails.send({
          from: 'Admin Reports <onboarding@resend.dev>',
          to: [user.email],
          subject: 'Weekly Analytics Report',
          html: `
            <h1>Weekly Analytics Report</h1>
            <p>Here's your weekly summary:</p>
            <ul>
              <li><strong>Total Users:</strong> ${totalUsers}</li>
              <li><strong>New Users (Last 7 Days):</strong> ${newUsers}</li>
              <li><strong>Admin Activities (Last 7 Days):</strong> ${recentActivity}</li>
            </ul>
            <p>Generated on ${now.toLocaleDateString()}</p>
          `,
        });
      }
    }

    // Update scheduled reports
    await supabase
      .from('scheduled_reports')
      .update({ 
        last_sent: now.toISOString(),
        next_scheduled: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('report_type', 'weekly_analytics');

    return new Response(
      JSON.stringify({ message: 'Reports sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('Error sending weekly report:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
