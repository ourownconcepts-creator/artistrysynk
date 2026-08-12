import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Ban, BellOff, Flag, Shield, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FlagContentDialog } from "@/components/FlagContentDialog";

interface ChatSafetyMenuProps {
  currentUserId: string;
  targetUserId: string;
  targetUserName: string;
}

/** Report, block or mute the other participant straight from a conversation. */
export const ChatSafetyMenu = ({
  currentUserId,
  targetUserId,
  targetUserName,
}: ChatSafetyMenuProps) => {
  const navigate = useNavigate();
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const block = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("blocked_users")
      .insert({ blocker_id: currentUserId, blocked_id: targetUserId });
    setBusy(false);
    setConfirmBlock(false);

    if (error && error.code !== "23505") {
      toast.error("Could not block this account");
      return;
    }
    toast.success(`${targetUserName} is blocked`, {
      description: "They can no longer message you or see you in discovery.",
    });
    void navigate({ to: "/messages" });
  };

  const mute = async () => {
    const { error } = await supabase
      .from("muted_users")
      .insert({ muter_id: currentUserId, muted_id: targetUserId });
    if (error && error.code !== "23505") {
      toast.error("Could not mute this account");
      return;
    }
    toast.success(`Muted ${targetUserName}`, {
      description: "You will stop getting notifications from them.",
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Safety options">
            <Shield className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Safety</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setReportOpen(true)}>
            <Flag className="mr-2 h-4 w-4" />
            Report {targetUserName.split(" ")[0]}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void mute()}>
            <BellOff className="mr-2 h-4 w-4" />
            Mute notifications
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => setConfirmBlock(true)}
          >
            <Ban className="mr-2 h-4 w-4" />
            Block account
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {reportOpen && (
        <FlagContentDialog
          contentType="profile"
          contentId={targetUserId}
          open={reportOpen}
          onOpenChange={setReportOpen}
        />
      )}

      <AlertDialog open={confirmBlock} onOpenChange={setConfirmBlock}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Block {targetUserName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              They will not be able to message you or find you in discovery, and this conversation
              will be hidden. You can undo this later in Settings → Privacy.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                void block();
              }}
            >
              {busy ? "Blocking…" : "Block account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
