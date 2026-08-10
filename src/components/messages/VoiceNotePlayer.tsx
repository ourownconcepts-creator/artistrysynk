import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const BARS = [6, 12, 8, 16, 10, 20, 9, 14, 7, 18, 11, 15, 8, 13, 6];

/** Compact waveform player for a voice note stored in the private bucket. */
export function VoiceNotePlayer({
  path,
  durationSeconds,
  mine,
}: {
  path: string;
  durationSeconds?: number | null;
  mine?: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let active = true;
    const sign = async () => {
      if (/^https?:\/\//.test(path)) {
        if (active) setUrl(path);
        return;
      }
      const { data } = await supabase.storage.from("voice-notes").createSignedUrl(path, 3600);
      if (active) setUrl(data?.signedUrl ?? null);
    };
    void sign();
    return () => {
      active = false;
    };
  }, [path]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) el.pause();
    else void el.play();
  };

  const total = durationSeconds ?? 0;

  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={toggle}
        disabled={!url}
        aria-label={playing ? "Pause voice note" : "Play voice note"}
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-full",
          mine ? "bg-primary-foreground/20 text-primary-foreground" : "bg-foreground/10 text-foreground",
        )}
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>

      <div className="flex h-6 items-center gap-[3px]" aria-hidden="true">
        {BARS.map((h, i) => (
          <span
            key={i}
            style={{ height: h }}
            className={cn(
              "w-[3px] rounded-full transition-opacity",
              mine ? "bg-primary-foreground" : "bg-foreground",
              i / BARS.length <= progress ? "opacity-100" : "opacity-35",
            )}
          />
        ))}
      </div>

      <span className={cn("text-[11px] tabular-nums", mine ? "text-primary-foreground/80" : "text-muted-foreground")}>
        {String(Math.floor(total / 60)).padStart(2, "0")}:{String(total % 60).padStart(2, "0")}
      </span>

      {url ? (
        <audio
          ref={audioRef}
          src={url}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setProgress(0);
          }}
          onTimeUpdate={(e) => {
            const el = e.currentTarget;
            if (el.duration) setProgress(el.currentTime / el.duration);
          }}
          className="hidden"
        />
      ) : null}
    </div>
  );
}