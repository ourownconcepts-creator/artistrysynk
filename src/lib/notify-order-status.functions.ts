import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const notifyOrderStatusSchema = z.object({
  orderId: z.string(),
  serviceTitle: z.string(),
  buyerEmail: z.string().email(),
  buyerName: z.string(),
  sellerName: z.string(),
  newStatus: z.string(),
  amount: z.number(),
});

export const notifyOrderStatus = createServerFn({ method: "POST" })
  .inputValidator(notifyOrderStatusSchema)
  .handler(async ({ data }) => {
    const { notifyOrderStatus } = await import("@/lib/notify-order-status.server");
    const { withRunLog } = await import("@/lib/functionRunLog.server");
    return withRunLog("notify-order-status", { orderId: data.orderId, newStatus: data.newStatus }, () =>
      notifyOrderStatus(data),
    );
  });
