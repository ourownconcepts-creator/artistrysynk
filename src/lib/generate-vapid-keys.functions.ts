import { createServerFn } from "@tanstack/react-start";

export const getOrGenerateVapidKeys = createServerFn({ method: "POST" }).handler(async () => {
  const { getOrGenerateVapidKeys } = await import("@/lib/generate-vapid-keys.server");
  return getOrGenerateVapidKeys();
});
