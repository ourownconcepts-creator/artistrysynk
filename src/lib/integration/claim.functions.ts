import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const completeIdentityClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ code: z.string().min(32).max(200) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { createHash } = await import("node:crypto");
    const { supabaseAdmin } =
      await import("@/integrations/supabase/client.server");
    const codeHash = createHash("sha256").update(data.code).digest("hex");
    const { data: intent, error } = await supabaseAdmin
      .from("integration_intents")
      .select(
        "id, client_id, external_subject, requested_scopes, redirect_uri, expires_at, status",
      )
      .eq("code_hash", codeHash)
      .eq("intent_type", "identity_create")
      .maybeSingle();
    if (
      error ||
      !intent ||
      intent.status !== "pending" ||
      new Date(intent.expires_at) <= new Date()
    ) {
      throw new Error("This identity invitation is invalid or has expired");
    }
    const { error: linkError } = await supabaseAdmin
      .from("integration_identity_links")
      .upsert(
        {
          client_id: intent.client_id,
          external_subject: intent.external_subject,
          user_id: context.userId,
          granted_scopes: intent.requested_scopes,
          status: "active",
          revoked_at: null,
        },
        { onConflict: "client_id,external_subject" },
      );
    if (linkError) throw new Error("This external identity is already linked");
    const { data: completed, error: completeError } = await supabaseAdmin
      .from("integration_intents")
      .update({
        status: "completed",
        consumed_at: new Date().toISOString(),
        user_id: context.userId,
      })
      .eq("id", intent.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (completeError || !completed)
      throw new Error("This identity invitation was already used");
    const { data: client } = await supabaseAdmin
      .from("integration_clients")
      .select("application_id")
      .eq("id", intent.client_id)
      .maybeSingle();
    await supabaseAdmin.from("integration_audit_events").insert({
      client_id: intent.client_id,
      application_id: client?.application_id ?? null,
      event_type: "identity.created",
      outcome: "success",
      subject_user_id: context.userId,
      external_subject_hash: createHash("sha256")
        .update(intent.external_subject)
        .digest("hex"),
      request_id: crypto.randomUUID(),
      metadata: { intent_id: intent.id },
    });
    return { redirectUri: intent.redirect_uri };
  });
