import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ADMIN_ROLES = ["admin", "master_admin", "super_admin", "technical_admin"] as const;

/**
 * Every function here reads server-only integration tables through the service
 * role client, so the caller's admin role is verified first through the
 * authenticated (RLS-respecting) client.
 */
async function assertAdmin(context: { supabase: any; userId: string }) {
  for (const role of ADMIN_ROLES) {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: role,
    });
    if (data === true) return;
  }
  throw new Error("Forbidden");
}

export type PartnerIdentityRow = {
  id: string;
  application: string;
  clientPublicId: string;
  environment: string;
  externalSubject: string;
  scopes: string[];
  status: string;
  linkedAt: string;
  revokedAt: string | null;
  profile: {
    userId: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    location: string | null;
    isVerified: boolean;
  } | null;
};

export type PartnerIntentRow = {
  id: string;
  application: string;
  clientPublicId: string;
  environment: string;
  type: string;
  externalSubject: string;
  scopes: string[];
  createdAt: string;
  expiresAt: string;
  expired: boolean;
  matchedProfile: PartnerIdentityRow["profile"];
};

type ClientJoin = {
  id: string;
  client_id: string;
  environment: string;
  integration_applications: { name: string; slug: string } | null;
} | null;

const appName = (client: unknown) =>
  (client as ClientJoin)?.integration_applications?.name ?? "Partner application";

/** Lists connected partner identities plus the requests still awaiting approval. */
export const listPartnerIdentities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const clientSelect =
      "integration_clients!inner(id, client_id, environment, integration_applications!inner(name, slug))";

    const [links, intents] = await Promise.all([
      supabaseAdmin
        .from("integration_identity_links")
        .select(
          `id, external_subject, user_id, granted_scopes, status, linked_at, revoked_at, ${clientSelect}`,
        )
        .order("linked_at", { ascending: false })
        .limit(500),
      supabaseAdmin
        .from("integration_intents")
        .select(
          `id, intent_type, external_subject, user_id, requested_scopes, status, created_at, expires_at, ${clientSelect}`,
        )
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const userIds = Array.from(
      new Set([
        ...(links.data ?? []).map((r) => r.user_id).filter(Boolean),
        ...(intents.data ?? []).map((r) => r.user_id).filter(Boolean),
      ]),
    ) as string[];

    const { data: profileRows } = userIds.length
      ? await supabaseAdmin
          .from("profiles")
          .select("id, username, display_name, full_name, avatar_url, location, is_verified")
          .in("id", userIds)
      : { data: [] as never[] };

    const profiles = new Map<string, PartnerIdentityRow["profile"]>();
    for (const row of profileRows ?? []) {
      profiles.set(row.id, {
        userId: row.id,
        username: row.username,
        displayName: row.display_name ?? row.full_name,
        avatarUrl: row.avatar_url,
        location: row.location,
        isVerified: Boolean(row.is_verified),
      });
    }

    // Subject → member map, used to suggest who a pending request belongs to.
    const subjectOwner = new Map<string, string>();
    for (const row of links.data ?? []) {
      if (row.external_subject && row.user_id)
        subjectOwner.set(row.external_subject, row.user_id);
    }

    const now = Date.now();
    return {
      identities: (links.data ?? []).map<PartnerIdentityRow>((row) => ({
        id: row.id,
        application: appName(row.integration_clients),
        clientPublicId: (row.integration_clients as ClientJoin)?.client_id ?? "",
        environment: (row.integration_clients as ClientJoin)?.environment ?? "unknown",
        externalSubject: row.external_subject,
        scopes: row.granted_scopes ?? [],
        status: row.status,
        linkedAt: row.linked_at,
        revokedAt: row.revoked_at,
        profile: row.user_id ? profiles.get(row.user_id) ?? null : null,
      })),
      pending: (intents.data ?? []).map<PartnerIntentRow>((row) => {
        const matchedId = row.user_id ?? subjectOwner.get(row.external_subject) ?? null;
        return {
          id: row.id,
          application: appName(row.integration_clients),
          clientPublicId: (row.integration_clients as ClientJoin)?.client_id ?? "",
          environment: (row.integration_clients as ClientJoin)?.environment ?? "unknown",
          type: row.intent_type,
          externalSubject: row.external_subject,
          scopes: row.requested_scopes ?? [],
          createdAt: row.created_at,
          expiresAt: row.expires_at,
          expired: new Date(row.expires_at).getTime() < now,
          matchedProfile: matchedId ? profiles.get(matchedId) ?? null : null,
        };
      }),
    };
  });

/** Reactivates or revokes an existing partner identity link. */
export const setPartnerLinkStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({ linkId: z.string().uuid(), status: z.enum(["active", "revoked"]) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();

    const { data: updated, error } = await supabaseAdmin
      .from("integration_identity_links")
      .update({
        status: data.status,
        revoked_at: data.status === "revoked" ? now : null,
        linked_at: data.status === "active" ? now : undefined,
        updated_at: now,
      })
      .eq("id", data.linkId)
      .select("id, client_id, user_id")
      .maybeSingle();
    if (error || !updated) throw new Error("Connection could not be updated");

    await supabaseAdmin.from("integration_audit_events").insert({
      client_id: updated.client_id,
      event_type: data.status === "active" ? "connection.reinstated" : "connection.revoked",
      outcome: "success",
      subject_user_id: updated.user_id,
      actor_user_id: context.userId,
      request_id: crypto.randomUUID(),
      metadata: { source: "admin_panel" },
    });

    return { status: data.status };
  });

/**
 * Approves a pending request by linking it to an ArtistrySynk member. The
 * member is identified by username so no identifier from the partner request
 * is trusted blindly, and the action is always audited.
 */
export const approvePartnerIntent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({ intentId: z.string().uuid(), username: z.string().trim().min(1).max(64) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();

    const { data: intent } = await supabaseAdmin
      .from("integration_intents")
      .select("id, client_id, external_subject, requested_scopes, status, expires_at")
      .eq("id", data.intentId)
      .maybeSingle();
    if (!intent || intent.status !== "pending")
      throw new Error("This request is no longer pending");
    if (new Date(intent.expires_at).getTime() < Date.now())
      throw new Error("This request has expired — ask the partner to send a new one");

    const { data: member } = await supabaseAdmin
      .from("profiles")
      .select("id, username")
      .ilike("username", data.username.replace(/^@/, ""))
      .maybeSingle();
    if (!member) throw new Error("No ArtistrySynk member found with that username");

    const { data: existing } = await supabaseAdmin
      .from("integration_identity_links")
      .select("id, user_id, external_subject")
      .eq("client_id", intent.client_id)
      .or(`user_id.eq.${member.id},external_subject.eq.${intent.external_subject}`)
      .maybeSingle();

    if (existing && existing.user_id !== member.id)
      throw new Error("That partner account is already linked to another member");

    if (existing) {
      await supabaseAdmin
        .from("integration_identity_links")
        .update({
          status: "active",
          external_subject: intent.external_subject,
          granted_scopes: intent.requested_scopes ?? [],
          revoked_at: null,
          linked_at: now,
          updated_at: now,
        })
        .eq("id", existing.id);
    } else {
      const { error: insertError } = await supabaseAdmin
        .from("integration_identity_links")
        .insert({
          client_id: intent.client_id,
          user_id: member.id,
          external_subject: intent.external_subject,
          granted_scopes: intent.requested_scopes ?? [],
          status: "active",
          linked_at: now,
        });
      if (insertError) throw new Error("The identity could not be linked");
    }

    await supabaseAdmin
      .from("integration_intents")
      .update({ status: "completed", user_id: member.id, consumed_at: now, updated_at: now })
      .eq("id", intent.id)
      .eq("status", "pending");

    await supabaseAdmin.from("integration_audit_events").insert({
      client_id: intent.client_id,
      event_type: "identity.link.approved",
      outcome: "success",
      subject_user_id: member.id,
      actor_user_id: context.userId,
      request_id: crypto.randomUUID(),
      metadata: { source: "admin_panel", intent_id: intent.id },
    });

    return { linked: true, username: member.username };
  });

/** Cancels a pending request so the partner has to start over. */
export const cancelPartnerIntent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ intentId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();

    const { data: updated, error } = await supabaseAdmin
      .from("integration_intents")
      .update({ status: "revoked", updated_at: now })
      .eq("id", data.intentId)
      .eq("status", "pending")
      .select("id, client_id")
      .maybeSingle();
    if (error || !updated) throw new Error("This request is no longer pending");

    await supabaseAdmin.from("integration_audit_events").insert({
      client_id: updated.client_id,
      event_type: "identity.link.cancelled",
      outcome: "success",
      actor_user_id: context.userId,
      request_id: crypto.randomUUID(),
      metadata: { source: "admin_panel", intent_id: updated.id },
    });

    return { cancelled: true };
  });
