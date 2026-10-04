import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const unsubscribeByToken = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().min(16).max(128) }).parse(d))
  .handler(async ({ data }) => {
    const { applyUnsubscribe } = await import("@/lib/unsubscribe.server");
    return applyUnsubscribe(data.token);
  });
