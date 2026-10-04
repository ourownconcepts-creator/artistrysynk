/** Escape LIKE wildcards so a case-insensitive match can only ever hit this exact address. */
const exactIlike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * Applies a marketing unsubscribe for a token from email_unsubscribe_tokens.
 * The token (64 random chars) maps to exactly one address; only that address is affected.
 */
export async function applyUnsubscribe(token: string): Promise<{ ok: boolean }> {
  if (!/^[A-Za-z0-9]{16,128}$/.test(token)) return { ok: false };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row } = await supabaseAdmin
    .from("email_unsubscribe_tokens")
    .select("email")
    .eq("token", token)
    .maybeSingle();
  if (!row?.email) {
    console.log(JSON.stringify({ event: "unsubscribe_invalid_token" }));
    return { ok: false };
  }
  const email = row.email.trim().toLowerCase();
  const like = exactIlike(email);
  const now = new Date().toISOString();

  await supabaseAdmin.from("newsletter_subscribers").update({ is_active: false, unsubscribed_at: now }).ilike("email", like);
  await supabaseAdmin
    .from("suppressed_emails")
    .upsert({ email, reason: "unsubscribe", metadata: { source: "newsletter_link" } }, { onConflict: "email", ignoreDuplicates: true });
  const { data: profs } = await supabaseAdmin.from("profiles").select("id, email").ilike("email", like);
  for (const p of (profs ?? []).filter((p) => (p.email ?? "").toLowerCase() === email)) {
    await supabaseAdmin.from("user_settings").update({ marketing_emails: false }).eq("user_id", p.id);
    await supabaseAdmin
      .from("user_consents")
      .insert({ user_id: p.id, consent_type: "marketing", granted: false, context: "unsubscribe_link" });
  }
  await (supabaseAdmin as any)
    .from("newsletter_recipients")
    .update({ status: "unsubscribed", error_code: "unsubscribed_link" })
    .eq("email", email)
    .in("status", ["pending", "rate_limited", "temporarily_failed"]);
  await supabaseAdmin.from("email_unsubscribe_tokens").update({ used_at: now }).eq("token", token);
  console.log(JSON.stringify({ event: "unsubscribed" }));
  return { ok: true };
}
