import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BellOff, Bell, Loader2 } from "lucide-react";

interface MuteUserButtonProps {
  userId: string;
  targetUserId: string;
  targetUserName: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  onChange?: (muted: boolean) => void;
}

export const MuteUserButton = ({
  userId,
  targetUserId,
  targetUserName,
  variant = "outline",
  size = "sm",
  onChange,
}: MuteUserButtonProps) => {
  const [muted, setMuted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await supabase
        .from("muted_users")
        .select("id")
        .eq("muter_id", userId)
        .eq("muted_id", targetUserId)
        .maybeSingle();
      if (active) setMuted(!!data);
    })();
    return () => {
      active = false;
    };
  }, [userId, targetUserId]);

  const toggle = async () => {
    setBusy(true);
    if (muted) {
      const { error } = await supabase
        .from("muted_users")
        .delete()
        .eq("muter_id", userId)
        .eq("muted_id", targetUserId);
      if (error) toast.error("Could not unmute");
      else {
        setMuted(false);
        onChange?.(false);
        toast.success(`${targetUserName} unmuted`);
      }
    } else {
      const { error } = await supabase
        .from("muted_users")
        .insert({ muter_id: userId, muted_id: targetUserId });
      if (error) toast.error("Could not mute");
      else {
        setMuted(true);
        onChange?.(true);
        toast.success(`${targetUserName} muted`, {
          description: "You won't see them in discovery or the collab feed.",
        });
      }
    }
    setBusy(false);
  };

  return (
    <Button
      variant={variant}
      size={size}
      className="gap-2"
      disabled={busy}
      onClick={() => void toggle()}
      aria-label={muted ? `Unmute ${targetUserName}` : `Mute ${targetUserName}`}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : muted ? (
        <Bell className="h-4 w-4" />
      ) : (
        <BellOff className="h-4 w-4" />
      )}
      {muted ? "Unmute" : "Mute"}
    </Button>
  );
};
