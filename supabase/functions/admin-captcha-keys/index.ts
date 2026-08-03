import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const SITE = "hcaptcha_site_key";
const SECRET = "hcaptcha_secret_key";

const mask = (value: string) => {
  const v = value.trim();
  if (!v) return null;
  if (v.length <= 8) return `${v.slice(0, 2)}••••`;
  return `${v.slice(0, 4)}••••${v.slice(-4)}`;
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await userClient.auth.getUser();
  const user = userData?.user;
  if (!user) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  const allowed = (roles ?? []).some((r) =>
    ["admin", "master_admin", "super_admin"].includes(r.role as string),
  );
  if (!allowed) return json({ error: "Forbidden" }, 403);

  const body = await req.json().catch(() => ({}));
  const action = body?.action ?? "status";

  const readStatus = async () => {
    const { data } = await admin
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
        siteKey: !!Deno.env.get("HCAPTCHA_SITE_KEY"),
        secretKey: !!Deno.env.get("HCAPTCHA_SECRET_KEY"),
      },
      active:
        !!(site?.setting_value?.trim() || Deno.env.get("HCAPTCHA_SITE_KEY")) &&
        !!(secret?.setting_value?.trim() || Deno.env.get("HCAPTCHA_SECRET_KEY")),
    };
  };

  try {
    if (action === "status") return json(await readStatus());

    if (action === "save") {
      const siteKey = typeof body.siteKey === "string" ? body.siteKey.trim() : "";
      const secretKey = typeof body.secretKey === "string" ? body.secretKey.trim() : "";
      if (!siteKey && !secretKey) return json({ error: "Provide at least one key to save." }, 400);
      if (siteKey && (siteKey.length < 8 || siteKey.length > 200)) return json({ error: "Site key looks invalid." }, 400);
      if (secretKey && (secretKey.length < 8 || secretKey.length > 500)) return json({ error: "Secret key looks invalid." }, 400);

      const rows: Array<{ setting_key: string; setting_value: string; updated_by: string }> = [];
      if (siteKey) rows.push({ setting_key: SITE, setting_value: siteKey, updated_by: user.id });
      if (secretKey) rows.push({ setting_key: SECRET, setting_value: secretKey, updated_by: user.id });

      const { error } = await admin
        .from("secure_integration_settings")
        .upsert(rows, { onConflict: "setting_key" });
      if (error) {
        console.error("save captcha keys failed:", error.message);
        return json({ error: "Could not save keys." }, 500);
      }

      await admin.from("activity_logs").insert({
        admin_id: user.id,
        action_type: "captcha_keys_updated",
        details: { updated: rows.map((r) => r.setting_key) },
      });

      return json({ success: true, ...(await readStatus()) });
    }

    if (action === "clear") {
      const { error } = await admin
        .from("secure_integration_settings")
        .delete()
        .in("setting_key", [SITE, SECRET]);
      if (error) {
        console.error("clear captcha keys failed:", error.message);
        return json({ error: "Could not clear keys." }, 500);
      }
      await admin.from("activity_logs").insert({
        admin_id: user.id,
        action_type: "captcha_keys_cleared",
        details: {},
      });
      return json({ success: true, ...(await readStatus()) });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("admin-captcha-keys error:", e instanceof Error ? e.message : e);
    return json({ error: "Unexpected error" }, 500);
  }
});
