import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Records/refreshes the caller's session row, capturing the real client IP
 * from the request on the server (browsers cannot see their own public IP).
 */
export const trackSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ sessionId: z.string().min(1).max(64), userAgent: z.string().max(500).nullable() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { getRequestHeader, getRequestIP, getRequest } = await import("@tanstack/react-start/server");
    const raw =
      getRequestHeader("cf-connecting-ip") ||
      getRequestHeader("x-real-ip") ||
      getRequestIP({ xForwardedFor: true }) ||
      null;
    const ip = raw ? raw.split(",")[0]!.trim().slice(0, 64) : null;
    // Approximate location from the edge network (no third-party lookup).
    let cf: Record<string, unknown> = {};
    try {
      cf = ((getRequest() as unknown as { cf?: Record<string, unknown> }).cf) ?? {};
    } catch {
      cf = {};
    }
    const clean = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 100) : null);
    const country = clean(cf["country"]) ?? clean(getRequestHeader("cf-ipcountry"));
    const region = clean(cf["region"]) ?? clean(getRequestHeader("cf-region"));
    const city = clean(cf["city"]) ?? clean(getRequestHeader("cf-ipcity"));
    const geo = {
      ...(country && country !== "XX" ? { country } : {}),
      ...(region ? { region } : {}),
      ...(city ? { city } : {}),
    };
    const now = new Date().toISOString();
    const { supabase, userId } = context;

    const { data: existing } = await supabase
      .from("user_sessions")
      .select("id")
      .eq("user_id", userId)
      .eq("session_id", data.sessionId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("user_sessions")
        .update({ last_active: now, is_active: true, ...(ip ? { ip_address: ip } : {}), ...geo })
        .eq("id", existing.id);
    } else {
      await supabase.from("user_sessions").insert({
        user_id: userId,
        session_id: data.sessionId,
        user_agent: data.userAgent,
        ip_address: ip,
        ...geo,
        is_active: true,
      });
    }
    return { ok: true };
  });
