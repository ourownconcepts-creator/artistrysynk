import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckPreferencesRequest {
  userId: string;
  notificationType: 'match' | 'message' | 'project' | 'marketing' | 'email';
}

interface NotificationPreferences {
  canSend: boolean;
  email_notifications: boolean;
  match_notifications: boolean;
  message_notifications: boolean;
  project_notifications: boolean;
  marketing_emails: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { userId, notificationType }: CheckPreferencesRequest = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch user notification preferences
    const { data: settings, error } = await supabase
      .from("user_settings")
      .select("email_notifications, match_notifications, message_notifications, project_notifications, marketing_emails")
      .eq("user_id", userId)
      .single();

    // Default preferences if no settings exist
    const defaultPreferences = {
      email_notifications: true,
      match_notifications: true,
      message_notifications: true,
      project_notifications: true,
      marketing_emails: false,
    };

    const preferences = settings || defaultPreferences;

    // Check if email notifications are enabled at all
    if (!preferences.email_notifications) {
      return new Response(
        JSON.stringify({
          canSend: false,
          reason: "User has disabled all email notifications",
          preferences,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check specific notification type
    let canSend = true;
    let reason = "";

    switch (notificationType) {
      case "match":
        canSend = preferences.match_notifications;
        reason = canSend ? "" : "User has disabled match notifications";
        break;
      case "message":
        canSend = preferences.message_notifications;
        reason = canSend ? "" : "User has disabled message notifications";
        break;
      case "project":
        canSend = preferences.project_notifications;
        reason = canSend ? "" : "User has disabled project notifications";
        break;
      case "marketing":
        canSend = preferences.marketing_emails;
        reason = canSend ? "" : "User has disabled marketing emails";
        break;
      case "email":
        // General email check - already passed above
        canSend = true;
        break;
      default:
        canSend = true;
    }

    return new Response(
      JSON.stringify({
        canSend,
        reason,
        preferences,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error checking notification preferences:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
