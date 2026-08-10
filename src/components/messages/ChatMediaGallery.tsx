import { useMemo, useState } from "react";
import { Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ImageAttachment } from "./ImageAttachment";
import { VoiceNotePlayer } from "./VoiceNotePlayer";

export type ChatMediaItem = {
  id: string;
  media_url?: string | null;
  media_type?: string | null;
  media_duration_seconds?: number | null;
  created_at: string;
};

/** Shared-media gallery for a conversation: images grid plus an audio clip list. */
export function ChatMediaGallery({ messages, name }: { messages: ChatMediaItem[]; name?: string }) {
  const [tab, setTab] = useState<"images" | "audio">("images");

  const images = useMemo(
    () => messages.filter((m) => m.media_type === "image" && m.media_url),
    [messages],
  );
  const audio = useMemo(
    () => messages.filter((m) => m.media_type === "audio" && m.media_url),
    [messages],
  );
  const total = images.length + audio.length;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="View shared media">
          <Images className="mr-2 h-4 w-4" />
          Media{total ? ` (${total})` : ""}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Shared media{name ? ` with ${name}` : ""}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          {(["images", "audio"] as const).map((key) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={tab === key ? "default" : "outline"}
              onClick={() => setTab(key)}
            >
              {key === "images" ? `Images (${images.length})` : `Audio (${audio.length})`}
            </Button>
          ))}
        </div>

        <div className="max-h-[60vh] overflow-y-auto pt-2">
          {tab === "images" ? (
            images.length ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {images.map((m) => (
                  <div key={m.id} className="overflow-hidden rounded-xl">
                    <ImageAttachment path={m.media_url as string} alt="Shared image" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No images shared yet.</p>
            )
          ) : audio.length ? (
            <ul className="space-y-2">
              {audio.map((m) => (
                <li key={m.id} className="rounded-xl border border-border/60 bg-surface-2 p-3">
                  <VoiceNotePlayer path={m.media_url as string} durationSeconds={m.media_duration_seconds} />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {new Date(m.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No audio clips shared yet.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
