import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const MAX_BYTES = 15 * 1024 * 1024;

/** Lets collaborators attach an image or audio clip to a chat message. */
export function AttachmentPicker({
  onPick,
  disabled,
}: {
  onPick: (file: File, kind: "image" | "audio") => Promise<void> | void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const kind = file.type.startsWith("image/") ? "image" : file.type.startsWith("audio/") ? "audio" : null;
    if (!kind) {
      toast.error("Only images and audio clips can be attached");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Attachments must be 15MB or smaller");
      return;
    }
    setBusy(true);
    try {
      await onPick(file, kind);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,audio/*"
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="rounded-full"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
        aria-label="Attach an image or audio clip"
        title="Attach an image or audio clip"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
      </Button>
    </>
  );
}
