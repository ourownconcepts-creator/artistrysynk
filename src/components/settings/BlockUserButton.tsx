import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import { Ban, Loader2 } from "lucide-react";

interface BlockUserButtonProps {
  userId: string;
  targetUserId: string;
  targetUserName: string;
  onBlocked?: () => void;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export const BlockUserButton = ({
  userId,
  targetUserId,
  targetUserName,
  onBlocked,
  variant = "outline",
  size = "sm",
}: BlockUserButtonProps) => {
  const [blocking, setBlocking] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const handleBlock = async () => {
    setBlocking(true);
    const { error } = await supabase
      .from("blocked_users")
      .insert({
        blocker_id: userId,
        blocked_id: targetUserId,
      });

    if (error) {
      if (error.code === "23505") {
        toast.info("User is already blocked");
        setIsBlocked(true);
      } else {
        toast.error("Failed to block user");
      }
    } else {
      toast.success(`${targetUserName} has been blocked`);
      setIsBlocked(true);
      onBlocked?.();
    }
    setBlocking(false);
  };

  if (isBlocked) {
    return (
      <Button variant="ghost" size={size} disabled className="text-muted-foreground">
        Blocked
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size={size} className="gap-2 text-destructive hover:text-destructive">
          <Ban className="w-4 h-4" />
          Block
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Block {targetUserName}?</AlertDialogTitle>
          <AlertDialogDescription>
            They won't be able to see your profile, match with you, or send you messages.
            You can unblock them anytime from your settings.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleBlock} disabled={blocking}>
            {blocking ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Block User
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
