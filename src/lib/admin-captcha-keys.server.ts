const SITE = "hcaptcha_site_key";
const SECRET = "hcaptcha_secret_key";

const mask = (value: string) => {
  const v = value.trim();
  if (!v) return null;
  if (v.length <= 8) return `${v.slice(0, 2)}••••`;
  return `${v.slice(0, 4)}••••${v.slice(-4)}`;
};

export async function readCaptchaKeysStatus() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("secure_integration_settings")
    .select("setting_key, setting_value, updated_at")
    .in("setting_key", [SITE, SECRET]);
  const rows = data ?? [];
  const find = (k: string) => rows.find((r) => r.setting_key === k);
  const site = find(SITE);
  const secret = find(SECRET);
  return {
    siteKeyPreview: site ? mask(site.setting_value) : null,
    secretKeyPreview: secret ? mask(secret.setting_value) : null,
    siteKeyUpdatedAt: site?.updated_at ?? null,
    secretKeyUpdatedAt: secret?.updated_at ?? null,
    envFallback: {
      siteKey: !!process.env["HCAPTCHA_SITE_KEY"],
      secretKey: !!process.env["HCAPTCHA_SECRET_KEY"],
    },
    active:
      !!(site?.setting_value?.trim() || process.env["HCAPTCHA_SITE_KEY"]) &&
      !!(secret?.setting_value?.trim() || process.env["HCAPTCHA_SECRET_KEY"]),
  };
}

export async function saveCaptchaKeys(userId: string, siteKey: string, secretKey: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  if (!siteKey && !secretKey) throw new Error("Provide at least one key to save.");
  if (siteKey && (siteKey.length < 8 || siteKey.length > 200)) throw new Error("Site key looks invalid.");
  if (secretKey && (secretKey.length < 8 || secretKey.length > 500)) throw new Error("Secret key looks invalid.");

  const rows: Array<{ setting_key: string; setting_value: string; updated_by: string }> = [];
  if (siteKey) rows.push({ setting_key: SITE, setting_value: siteKey, updated_by: userId });
  if (secretKey) rows.push({ setting_key: SECRET, setting_value: secretKey, updated_by: userId });

  const { error } = await supabaseAdmin
    .from("secure_integration_settings")
    .upsert(rows, { onConflict: "setting_key" });
  if (error) {
    console.error("save captcha keys failed:", error.message);
    throw new Error("Could not save keys.");
  }

  await supabaseAdmin.from("activity_logs").insert({
    admin_id: userId,
    action_type: "captcha_keys_updated",
    details: { updated: rows.map((r) => r.setting_key) },
  });

  return { success: true as const, ...(await readCaptchaKeysStatus()) };
}

export async function clearCaptchaKeys(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("secure_integration_settings")
    .delete()
    .in("setting_key", [SITE, SECRET]);
  if (error) {
    console.error("clear captcha keys failed:", error.message);
    throw new Error("Could not clear keys.");
  }
  await supabaseAdmin.from("activity_logs").insert({
    admin_id: userId,
    action_type: "captcha_keys_cleared",
    details: {},
  });
  return { success: true as const, ...(await readCaptchaKeysStatus()) };
}
