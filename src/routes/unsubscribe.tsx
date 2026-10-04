import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { unsubscribeByToken } from "@/lib/unsubscribe.functions";

export const Route = createFileRoute("/unsubscribe")({
  validateSearch: z.object({ token: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Unsubscribe — ArtistrySynk" },
      { name: "description", content: "Stop receiving ArtistrySynk newsletters and product updates." },
      { property: "og:title", content: "Unsubscribe — ArtistrySynk" },
      { property: "og:description", content: "Stop receiving ArtistrySynk newsletters and product updates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  server: {
    handlers: {
      // RFC 8058 one-click unsubscribe from mail clients.
      POST: async ({ request }) => {
        const token = new URL(request.url).searchParams.get("token") ?? "";
        const { applyUnsubscribe } = await import("@/lib/unsubscribe.server");
        const r = await applyUnsubscribe(token);
        return new Response(r.ok ? "Unsubscribed" : "Invalid link", { status: r.ok ? 200 : 400 });
      },
    },
  },
  component: UnsubscribePage,
});

function UnsubscribePage() {
  const { token } = Route.useSearch();
  const run = useServerFn(unsubscribeByToken);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  const confirm = async () => {
    if (!token) return setState("error");
    setState("busy");
    try {
      const r = await run({ data: { token } });
      setState(r.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full text-center space-y-4 border rounded-2xl p-8 bg-card">
        <h1 className="text-2xl font-bold text-foreground">Unsubscribe from ArtistrySynk emails</h1>
        {state === "done" ? (
          <p className="text-muted-foreground">You've been unsubscribed. You'll still get emails about your account, like password resets.</p>
        ) : state === "error" ? (
          <p className="text-destructive">This unsubscribe link is invalid or has expired.</p>
        ) : (
          <>
            <p className="text-muted-foreground">You'll stop receiving newsletters and product updates.</p>
            <Button onClick={confirm} disabled={state === "busy" || !token}>
              {state === "busy" ? "Unsubscribing…" : "Confirm unsubscribe"}
            </Button>
          </>
        )}
        <Link to="/" className="block text-sm text-primary">Back to ArtistrySynk</Link>
      </div>
    </main>
  );
}
