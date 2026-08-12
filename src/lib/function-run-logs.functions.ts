import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const listFunctionRunsSchema = z.object({
  functionName: z.string().trim().max(120).optional().nullable(),
  status: z.enum(["success", "error"]).optional().nullable(),
  hours: z.number().int().min(1).max(720).default(168),
  limit: z.number().int().min(1).max(300).default(100),
});

export const listFunctionRuns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(listFunctionRunsSchema)
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/authz.server");
    await assertAdmin(context.supabase, context.userId);

    const { listFunctionRuns: impl } = await import("@/lib/function-run-logs.server");
    return impl(context.supabase, data);
  });
