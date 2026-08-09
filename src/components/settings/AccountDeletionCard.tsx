import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@/lib/router-compat";
import {
  requestAccountDeletion,
  cancelAccountDeletion,
  getMyDeletionRequest,
  type DeletionRequestState,
} from "@/lib/account-deletion.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Loader2, MailCheck, Undo2, ShieldAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "";

const daysLeft = (iso?: string) => {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
};

export const AccountDeletionCard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const loadState = useServerFn(getMyDeletionRequest);
  const runRequest = useServerFn(requestAccountDeletion);
  const runCancel = useServerFn(cancelAccountDeletion);

  const [state, setState] = useState<DeletionRequestState | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    loadState()
      .then((result) => {
        if (active) setState(result);
      })
      .catch(async () => {
        if (!active) return;
        const { data } = await supabase.auth.getSession();
        if (!data.session) navigate("/auth", { replace: true });
      });
    return () => {
      active = false;
    };
  }, [loadState, navigate]);

  const sendRequest = async (resend: boolean) => {
    setBusy(true);
    try {
      const result = await runRequest({ data: { origin: window.location.origin } });
      setState(result);
      setOpen(false);
      setConfirmText("");
      toast.success(resend ? "Confirmation email sent again." : "Check your email to confirm the deletion.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start the deletion request.");
    } finally {
      setBusy(false);
    }
  };

  const undoDeletion = async () => {
    setBusy(true);
    try {
      await runCancel();
      setState({ status: "none", gracePeriodDays: state?.gracePeriodDays ?? 7 });
      await queryClient.invalidateQueries();
      toast.success("Deletion cancelled — your account is safe.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not cancel the deletion.");
    } finally {
      setBusy(false);
    }
  };

  const grace = state?.gracePeriodDays ?? 7;

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="text-destructive flex items-center gap-2">
          <ShieldAlert className="w-5 h-5" aria-hidden="true" />
          Danger Zone
        </CardTitle>
        <CardDescription>
          Deleting your account needs email confirmation, then waits {grace} days before anything is
          removed — so you can always undo it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {state?.status === "pending_confirmation" && (
          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <MailCheck className="w-4 h-4 text-primary" aria-hidden="true" />
              <span className="font-medium">Confirmation email sent</span>
              <Badge variant="secondary">Awaiting confirmation</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              We emailed a confirmation link to <span className="font-medium">{state.email}</span> on{" "}
              {formatDate(state.requestedAt)}. Nothing is deleted until you open that link.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={undoDeletion} disabled={busy} className="gap-2">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />}
                Cancel request
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void sendRequest(true)} disabled={busy}>
                Resend email
              </Button>
            </div>
          </div>
        )}

        {state?.status === "scheduled" && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Trash2 className="w-4 h-4 text-destructive" aria-hidden="true" />
              <span className="font-medium">Deletion scheduled</span>
              <Badge variant="destructive">{daysLeft(state.scheduledFor)} days left</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Your account and data will be permanently deleted on{" "}
              <span className="font-medium text-foreground">{formatDate(state.scheduledFor)}</span>. You
              can undo this any time before then.
            </p>
            <Button onClick={undoDeletion} disabled={busy} className="gap-2">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />}
              Undo deletion
            </Button>
          </div>
        )}

        {(!state || state.status === "none") && (
          <AlertDialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) setConfirmText("");
            }}
          >
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="w-4 h-4" />
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Request account deletion?</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2 text-left">
                    <p>
                      We'll email you a confirmation link. After you confirm, your account stays
                      recoverable for {grace} days, then everything — profile, matches, messages,
                      portfolio, projects and settings — is permanently removed.
                    </p>
                    <p>
                      Type <span className="font-semibold text-foreground">DELETE</span> below to
                      continue.
                    </p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
                aria-label="Type DELETE to confirm account deletion"
              />
              <AlertDialogFooter>
                <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    void sendRequest(false);
                  }}
                  disabled={busy || confirmText.trim().toUpperCase() !== "DELETE"}
                  className="gap-2"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  {busy ? "Sending…" : "Email me the confirmation"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardContent>
    </Card>
  );
};