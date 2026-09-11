import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type ClientRow = {
  id: string;
  client_id: string;
  environment: string;
  status: string;
  integration_applications: { name: string; slug: string } | null;
};

export type ConnectionEntry = {
  id: string;
  application: string;
  clientPublicId: string;
  environment: string;
  scopes: string[];
  linkedAt: string;
  revokedAt: string | null;
  status: string;
};

export type PendingApproval = {
  id: string;
  application: string;
  clientPublicId: string;
  type: string;
  scopes: string[];
  expiresAt: string;
  createdAt: string;
};

/**
 * User-scoped view of partner integration connections. Reads through the
 * service-role client because the integration tables are server-only, but every
 * query is filtered to the authenticated user's own rows.
 */
export const listMyIntegrationConnections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } =
      await import("@/integrations/supabase/client.server");

    const [{ data: links }, { data: intents }] = await Promise.all([
      supabaseAdmin
        .from("integration_identity_links")
        .select(
          "id, granted_scopes, linked_at, revoked_at, status, integration_clients!inner(id, client_id, environment, status, integration_applications!inner(name, slug))",
        )
        .eq("user_id", context.userId)
        .order("linked_at", { ascending: false }),
      supabaseAdmin
        .from("integration_intents")
        .select(
          "id, intent_type, requested_scopes, expires_at, created_at, status, integration_clients!inner(id, client_id, environment, status, integration_applications!inner(name, slug))",
        )
        .eq("user_id", context.userId)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false }),
    ]);

    const appName = (client: unknown) =>
      (client as ClientRow | null)?.integration_applications?.name ??
      "Partner application";
    const clientOf = (client: unknown) => client as ClientRow | null;

    const all: ConnectionEntry[] = (links ?? []).map((row) => ({
      id: row.id,
      application: appName(row.integration_clients),
      clientPublicId: clientOf(row.integration_clients)?.client_id ?? "",
      environment: clientOf(row.integration_clients)?.environment ?? "unknown",
      scopes: row.granted_scopes ?? [],
      linkedAt: row.linked_at,
      revokedAt: row.revoked_at,
      status: row.status,
    }));

    return {
      linked: all.filter((entry) => entry.status === "active"),
      revoked: all.filter((entry) => entry.status !== "active"),
      pending: (intents ?? []).map<PendingApproval>((row) => ({
        id: row.id,
        application: appName(row.integration_clients),
        clientPublicId: clientOf(row.integration_clients)?.client_id ?? "",
        type: row.intent_type,
        scopes: row.requested_scopes ?? [],
        expiresAt: row.expires_at,
        createdAt: row.created_at,
      })),
    };
  });

/** Lets a user revoke one of their own partner connections. */
export const revokeMyIntegrationConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ linkId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } =
      await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    const { data: updated, error } = await supabaseAdmin
      .from("integration_identity_links")
      .update({ status: "revoked", revoked_at: now, updated_at: now })
      .eq("id", data.linkId)
      .eq("user_id", context.userId)
      .eq("status", "active")
      .select("id, client_id")
      .maybeSingle();
    if (error || !updated) throw new Error("Connection could not be revoked");

    await supabaseAdmin.from("integration_audit_events").insert({
      client_id: updated.client_id,
      event_type: "connection.revoked",
      outcome: "success",
      subject_user_id: context.userId,
      request_id: crypto.randomUUID(),
      metadata: { source: "user_settings" },
    });

    return { revoked: true };
  });
