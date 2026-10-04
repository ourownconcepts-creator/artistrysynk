/** Applies a marketing unsubscribe for a token from email_unsubscribe_tokens. */
export async function applyUnsubscribe(token: string): Promise<{ ok: boolean }> {
  if (!/^[A-Za-z0-9]{16,128}$/.test(token)) return { ok: false };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row } = await supabaseAdmin
    .from("email_unsubscribe_tokens")
    .select("email")
    .eq("token", token)
    .maybeSingle();
  if (!row?.email) return { ok: false };
  const email = row.email.toLowerCase();
  const now = new Date().toISOString();

  await supabaseAdmin.from("newsletter_subscribers").update({ is_active: false, unsubscribed_at: now }).ilike("email", email);
  await supabaseAdmin
    .from("suppressed_emails")
    .upsert({ email, reason: "unsubscribe", metadata: { source: "newsletter_link" } }, { onConflict: "email", ignoreDuplicates: true });
  const { data: prof } = await supabaseAdmin.from("profiles").select("id").ilike("email", email).maybeSingle();
  if (prof?.id) {
    await supabaseAdmin.from("user_settings").update({ marketing_emails: false }).eq("user_id", prof.id);
    await supabaseAdmin
      .from("user_consents")
      .insert({ user_id: prof.id, consent_type: "marketing", granted: false, context: "unsubscribe_link" });
  }
  // Remove from any queued campaign.
  await (supabaseAdmin as any)
    .from("newsletter_recipients")
    .update({ status: "unsubscribed", error_code: "unsubscribed_link" })
    .eq("email", email)
    .in("status", ["pending", "rate_limited"]);
  await supabaseAdmin.from("email_unsubscribe_tokens").update({ used_at: now }).eq("token", token);
  console.log(JSON.stringify({ event: "unsubscribed" }));
  return { ok: true };
}
