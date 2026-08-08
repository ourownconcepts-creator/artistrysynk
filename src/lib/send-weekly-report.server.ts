import { LOGO_URL, sendEmail } from "@/lib/email/resend.server";

const brandedHeader = `
  <div style="text-align: center; padding: 30px 0 20px 0; background: linear-gradient(135deg, #c026d3 0%, #7c3aed 50%, #f97316 100%); border-radius: 12px 12px 0 0;">
    <img src="${LOGO_URL}" alt="ArtistrySynk" style="height: 80px; width: auto;" />
  </div>
`;

export async function sendWeeklyReport() {
  const { supabaseAdmin: supabase } = await import("@/integrations/supabase/client.server");

  const { data: profiles } = await supabase.from("profiles").select("created_at");
  const { data: activityLogs } = await supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const now = new Date();
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const newUsers = profiles?.filter((p) => p.created_at != null && new Date(p.created_at) > lastWeek).length || 0;
  const totalUsers = profiles?.length || 0;
  const recentActivity = activityLogs?.filter((a) => a.created_at != null && new Date(a.created_at) > lastWeek).length || 0;

  const { data: superAdmins } = await supabase.from("user_roles").select("user_id").eq("role", "super_admin");

  if (!superAdmins || superAdmins.length === 0) {
    return { message: "No super admins to send report to" };
  }

  for (const admin of superAdmins) {
    const {
      data: { user },
    } = await supabase.auth.admin.getUserById(admin.user_id);

    if (user?.email) {
      await sendEmail({
        from: "Admin Reports <reports@artistrysynk.app>",
        to: user.email,
        subject: "Weekly Analytics Report",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              ${brandedHeader}
              <div style="padding: 30px;">
                <h1>Weekly Analytics Report</h1>
                <p>Here's your weekly summary:</p>
                <ul>
                  <li><strong>Total Users:</strong> ${totalUsers}</li>
                  <li><strong>New Users (Last 7 Days):</strong> ${newUsers}</li>
                  <li><strong>Admin Activities (Last 7 Days):</strong> ${recentActivity}</li>
                </ul>
                <p>Generated on ${now.toLocaleDateString()}</p>
                <hr style="margin: 20px 0; border: none; border-top: 1px solid #E5E7EB;" />
                <p style="color: #6B7280; font-size: 12px;">The ArtistrySynk Team</p>
              </div>
            </div>
          `,
      });
    }
  }

  await supabase
    .from("scheduled_reports")
    .update({
      last_sent: now.toISOString(),
      next_scheduled: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq("report_type", "weekly_analytics");

  return { message: "Reports sent successfully" };
}
