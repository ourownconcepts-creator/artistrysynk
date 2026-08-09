import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { confirmAccountDeletion } from "@/lib/account-deletion.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/account/confirm-deletion")({
  head: () => ({
    meta: [
      { title: "Confirm Account Deletion | ArtistrySynk" },
      {
        name: "description",
        content:
          "Confirm your ArtistrySynk account deletion request. You keep a 7-day window to undo it.",
      },
      { property: "og:title", content: "Confirm Account Deletion | ArtistrySynk" },
      {
        property: "og:description",
        content: "Confirm your ArtistrySynk account deletion request.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ConfirmDeletionPage,
});

function ConfirmDeletionPage() {
  const runConfirm = useServerFn(confirmAccountDeletion);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setStatus("error");
      setMessage("This link is missing its confirmation code.");
      return;
    }

    runConfirm({ data: { token } })
      .then((result) => {
        if (!result.ok) {
          setStatus("error");
          setMessage(
            result.reason === "cancelled"
              ? "This deletion request was already cancelled — your account is active."
              : result.reason === "completed"
                ? "This request was already completed."
                : "This confirmation link is invalid or has expired.",
          );
          return;
        }
        setStatus("ok");
        setScheduledFor(result.scheduledFor);
      })
      .catch(() => {
        setStatus("error");
        setMessage("We couldn't confirm your request. Please try again from Settings.");
      });
  }, [runConfirm]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status === "loading" && <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />}
            {status === "ok" && <ShieldCheck className="w-5 h-5 text-destructive" aria-hidden="true" />}
            {status === "error" && <ShieldAlert className="w-5 h-5 text-muted-foreground" aria-hidden="true" />}
            {status === "loading"
              ? "Confirming…"
              : status === "ok"
                ? "Deletion confirmed"
                : "Link not valid"}
          </CardTitle>
          <CardDescription>
            {status === "ok"
              ? "Your account is scheduled for permanent deletion."
              : "Account deletion confirmation"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "ok" && (
            <p className="text-sm text-muted-foreground">
              Everything will be permanently removed on{" "}
              <span className="font-medium text-foreground">
                {scheduledFor ? new Date(scheduledFor).toLocaleString() : ""}
              </span>
              . Until then you can undo it any time from Settings — just sign in and choose "Undo
              deletion".
            </p>
          )}
          {status === "error" && <p className="text-sm text-muted-foreground">{message}</p>}
          {status !== "loading" && (
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link to="/settings">Go to Settings</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/">Back home</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}