import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const submitContactSupportSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(30).optional().nullable(),
  subject: z.string().trim().min(3).max(150),
  message: z.string().trim().min(20).max(2000),
  honeypot: z.string().max(200).optional(),
  elapsedMs: z.number().int().nonnegative().max(86_400_000).optional(),
  captchaToken: z.string().max(5000).optional(),
});

export const submitContactSupport = createServerFn({ method: "POST" })
  .validator(submitContactSupportSchema)
  .handler(async ({ data }) => {
    const { submitContactSupport } = await import("@/lib/submit-contact-support.server");
    const { withRunLog } = await import("@/lib/functionRunLog.server");
    return withRunLog("submit-contact-support", { subject: data.subject }, () => submitContactSupport(data));
  });
