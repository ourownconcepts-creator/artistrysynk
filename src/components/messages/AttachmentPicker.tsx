import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, X, Music2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const MAX_BYTES = 15 * 1024 * 1024;

/** Lets collaborators attach an image or audio clip, preview it, and watch upload progress. */
export function AttachmentPicker({
  onPick,
  disabled,
  progress,
}: {
  onPick: (file: File, kind: "image" | "audio") => Promise<void> | void;
  disabled?: boolean;
  progress?: number | null;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ file: File; kind: "image" | "audio"; url: string } | null>(null);

  useEffect(() => () => { if (pending) URL.revokeObjectURL(pending.url); }, [pending]);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (inputRef.current) inputRef.current.value = "";
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
    setPending({ file, kind, url: URL.createObjectURL(file) });
  };

  const clear = () => {
    if (pending) URL.revokeObjectURL(pending.url);
    setPending(null);
  };

  const confirm = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await onPick(pending.file, pending.kind);
      clear();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,audio/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
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

      {pending ? (
        <div className="absolute inset-x-3 bottom-full mb-2 rounded-2xl border border-border/60 bg-card/95 p-3 shadow-lg backdrop-blur">
          <div className="flex items-center gap-3">
            {pending.kind === "image" ? (
              <img src={pending.url} alt="Attachment preview" className="h-16 w-16 rounded-xl object-cover" />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-xl bg-surface-3 text-muted-foreground">
                <Music2 className="h-6 w-6" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{pending.file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(pending.file.size / 1024 / 1024).toFixed(2)} MB
              </p>
              {busy ? (
                <div className="mt-2 flex items-center gap-2">
                  <Progress value={progress ?? 0} className="h-1.5 flex-1" />
                  <span className="text-[11px] tabular-nums text-muted-foreground">{progress ?? 0}%</span>
                </div>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button type="button" variant="ghost" size="icon" onClick={clear} disabled={busy} aria-label="Discard attachment">
                <X className="h-4 w-4" />
              </Button>
              <Button type="button" size="icon" variant="hero" onClick={() => void confirm()} disabled={busy} aria-label="Send attachment">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
