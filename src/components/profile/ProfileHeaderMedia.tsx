import { useRef, useState } from "react";
import { Play, Pause, Music2 } from "lucide-react";

export type FeaturedMedia = {
  id: string;
  title: string;
  media_type: string;
  media_url: string;
  thumbnail_url: string | null;
};

/**
 * Responsive audio/video preview for the public profile header.
 * Video fills the cover area; audio renders as a compact play bar.
 */
export function ProfileHeaderMedia({ item, name }: { item: FeaturedMedia; name: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const el = item.media_type === "video" ? videoRef.current : audioRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  const label = `${playing ? "Pause" : "Play"} ${item.title || "featured media"} by ${name}`;

  if (item.media_type === "video") {
    return (
      <div className="absolute inset-0">
        <video
          ref={videoRef}
          src={item.media_url}
          poster={item.thumbnail_url ?? undefined}
          playsInline
          muted
          loop
          preload="metadata"
          onEnded={() => setPlaying(false)}
          aria-label={`${item.title || "Featured video"} by ${name}`}
          className="h-full w-full object-cover"
        />
        <button
          type="button"
          onClick={toggle}
          aria-label={label}
          aria-pressed={playing}
          className="absolute bottom-3 right-3 grid h-11 w-11 place-items-center rounded-full bg-background/80 text-foreground backdrop-blur transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 flex items-center gap-3 rounded-2xl border border-border bg-muted/40 p-3">
      <audio ref={audioRef} src={item.media_url} preload="none" onEnded={() => setPlaying(false)} />
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-pressed={playing}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
      </button>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Featured track</p>
        <p className="truncate text-sm font-medium">{item.title || "Untitled"}</p>
      </div>
      <Music2 className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </div>
  );
}