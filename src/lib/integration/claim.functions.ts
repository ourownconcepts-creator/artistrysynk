import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Completes an identity-create claim for the signed-in ArtistrySynk member and
 * issues a single-use completion code. The browser is then redirected to the
 * redirect_uri that was validated when the intent was created, carrying only
 * `code` (and the partner's own `state`) — never an identity id or a token.
 */
export const completeIdentityClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        code: z.string().min(32).max(200),
        state: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { createHash, randomBytes } = await import("node:crypto");
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

    // A client may hold at most one link per external subject and one per
    // ArtistrySynk member. Re-pointing the member's own link is allowed;
    // stealing another member's external subject is not.
    const { data: bySubject } = await supabaseAdmin
      .from("integration_identity_links")
      .select("id, user_id")
      .eq("client_id", intent.client_id)
      .eq("external_subject", intent.external_subject)
      .maybeSingle();
    if (bySubject && bySubject.user_id !== context.userId) {
      throw new Error(
        "This external account is already connected to a different ArtistrySynk identity",
      );
    }
    const { data: byUser } = await supabaseAdmin
      .from("integration_identity_links")
      .select("id, external_subject")
      .eq("client_id", intent.client_id)
      .eq("user_id", context.userId)
      .maybeSingle();

    const linkPayload = {
      client_id: intent.client_id,
      external_subject: intent.external_subject,
      user_id: context.userId,
      granted_scopes: intent.requested_scopes,
      status: "active",
      revoked_at: null,
    };
    const targetId = bySubject?.id ?? byUser?.id ?? null;
    const { error: linkError } = targetId
      ? await supabaseAdmin
          .from("integration_identity_links")
          .update(linkPayload)
          .eq("id", targetId)
      : await supabaseAdmin
          .from("integration_identity_links")
          .insert(linkPayload);
    if (linkError) throw new Error("This identity could not be connected");

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

    // One-time completion code: the partner exchanges it server-side.
    const completionCode = randomBytes(32).toString("base64url");
    const { error: codeError } = await supabaseAdmin
      .from("integration_completion_codes")
      .insert({
        client_id: intent.client_id,
        intent_id: intent.id,
        user_id: context.userId,
        external_subject: intent.external_subject,
        granted_scopes: intent.requested_scopes,
        redirect_uri: intent.redirect_uri,
        code_hash: createHash("sha256").update(completionCode).digest("hex"),
        state: data.state ?? null,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });
    if (codeError) throw new Error("This identity could not be connected");

    const { data: client } = await supabaseAdmin
      .from("integration_clients")
      .select("application_id")
      .eq("id", intent.client_id)
      .maybeSingle();
    const externalSubjectHash = createHash("sha256")
      .update(intent.external_subject)
      .digest("hex");
    await supabaseAdmin.from("integration_audit_events").insert([
      {
        client_id: intent.client_id,
        application_id: client?.application_id ?? null,
        event_type: "identity.created",
        outcome: "success",
        subject_user_id: context.userId,
        external_subject_hash: externalSubjectHash,
        request_id: crypto.randomUUID(),
        metadata: { intent_id: intent.id },
      },
      {
        client_id: intent.client_id,
        application_id: client?.application_id ?? null,
        event_type: "identity.linked",
        outcome: "success",
        subject_user_id: context.userId,
        external_subject_hash: externalSubjectHash,
        request_id: crypto.randomUUID(),
        metadata: { intent_id: intent.id, completion_code_issued: true },
      },
    ]);

    // redirect_uri was validated against the client's registered callbacks when
    // the intent was created; it is used verbatim and never taken from input.
    const target = new URL(intent.redirect_uri);
    target.searchParams.set("code", completionCode);
    if (data.state) target.searchParams.set("state", data.state);
    return { redirectUri: target.toString() };
  });
