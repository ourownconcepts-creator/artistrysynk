import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const sendWelcomeEmailSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  username: z.string().optional().default(""),
});

export const sendWelcomeEmail = createServerFn({ method: "POST" })
  .validator(sendWelcomeEmailSchema)
  .handler(async ({ data }) => {
    const { sendWelcomeEmail } = await import("@/lib/send-welcome-email.server");
    const { withRunLog } = await import("@/lib/functionRunLog.server");
    return withRunLog("send-welcome-email", { email: data.email }, () => sendWelcomeEmail(data));
  });
