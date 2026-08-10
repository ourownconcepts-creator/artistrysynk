/**
 * Studio V1 — server-authoritative writes.
 *
 * Ownership, entitlement and lifecycle are decided on the server: the RPCs below
 * derive the acting user from auth.uid(), so owner_id, entitlement and activation
 * can never be supplied by the client.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createSchema = z.object({
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$/, "Handle must be 3-30 lowercase letters, numbers, dashes or underscores"),
  name: z.string().trim().min(2).max(80),
  orgType: z.enum(["studio", "agency", "label", "production_company", "collective"]).default("studio"),
  tagline: z.string().trim().max(140).optional(),
  bio: z.string().trim().max(4000).optional(),
  city: z.string().trim().max(80).optional(),
  country: z.string().trim().max(80).optional(),
  contactEmail: z.string().trim().email().max(255).optional().or(z.literal("")),
  facilities: z.array(z.string().trim().max(60)).max(30).default([]),
});

/** Creates the studio and its owner membership in one transactional server step. */
export const createStudioFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ id: string; handle: string }> => {
    const { data: rows, error } = await context.supabase.rpc("create_studio", {
      _handle: data.handle,
      _name: data.name,
      _org_type: data.orgType,
      _tagline: data.tagline ?? null,
      _bio: data.bio ?? null,
      _primary_city: data.city ?? null,
      _primary_country: data.country ?? null,
      _contact_email: data.contactEmail ? data.contactEmail : null,
      _facilities: data.facilities,
    });
    if (error) throw new Error(error.message);
    const row = (rows as { id: string; handle: string }[] | null)?.[0];
    if (!row) throw new Error("Could not create the studio");
    return row;
  });

/** Owner-only: hands the studio to an active member and demotes the old owner to admin. */
export const transferStudioOwnershipFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ studioId: z.string().uuid(), newOwnerId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase.rpc("transfer_studio_ownership", {
      _studio_id: data.studioId,
      _new_owner_id: data.newOwnerId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Owner-only: deactivate/reactivate. Nothing is deleted — the studio leaves public surfaces. */
export const setStudioActiveFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ studioId: z.string().uuid(), active: z.boolean() }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase.rpc("set_studio_active", {
      _studio_id: data.studioId,
      _active: data.active,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
