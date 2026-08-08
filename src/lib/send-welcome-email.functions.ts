import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const sendWelcomeEmailSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  username: z.string().optional().default(""),
});

export const sendWelcomeEmail = createServerFn({ method: "POST" })
  .inputValidator(sendWelcomeEmailSchema)
  .handler(async ({ data }) => {
    const { sendWelcomeEmail } = await import("@/lib/send-welcome-email.server");
    return sendWelcomeEmail(data);
  });
