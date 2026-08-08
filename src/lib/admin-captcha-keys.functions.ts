import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const adminCaptchaKeysSchema = z.object({
  action: z.enum(["status", "save", "clear"]).default("status"),
  siteKey: z.string().optional().default(""),
  secretKey: z.string().optional().default(""),
});

export const adminCaptchaKeys = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(adminCaptchaKeysSchema)
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/authz.server");
    await assertAdmin(context.supabase, context.userId);

    const impl = await import("@/lib/admin-captcha-keys.server");

    if (data.action === "status") return impl.readCaptchaKeysStatus();
    if (data.action === "save") {
      return impl.saveCaptchaKeys(context.userId, data.siteKey.trim(), data.secretKey.trim());
    }
    if (data.action === "clear") return impl.clearCaptchaKeys(context.userId);

    throw new Error("Unknown action");
  });
