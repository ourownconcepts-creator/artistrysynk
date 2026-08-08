import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const paystackInitializeInput = z.object({
  email: z.string(),
  plan: z.string(),
  userId: z.string(),
});

export const initializePaystackTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(paystackInitializeInput)
  .handler(async ({ data, context }) => {
    const { initializePaystackTransaction } = await import("@/lib/paystack-initialize.server");
    const request = getRequest();
    const origin = request?.headers.get("origin") ?? null;
    return initializePaystackTransaction({
      email: data.email,
      plan: data.plan,
      userId: data.userId,
      authenticatedUserId: context.userId,
      origin,
    });
  });
