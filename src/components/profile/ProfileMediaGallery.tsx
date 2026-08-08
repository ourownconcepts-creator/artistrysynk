import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Play, Pause, Music2, ImageOff, Film } from "lucide-react";

export type GalleryItem = {
  id: string;
  title: string;
  media_type: string;
  media_url: string;
  thumbnail_url: string | null;
};

/**
 * Responsive, keyboard-accessible media carousel for public profiles.
 * Supports multiple image/audio/video items and shows a labelled
 * placeholder whenever a preview fails to load.
 */
export function ProfileMediaGallery({ items, name }: { items: GalleryItem[]; name: string }) {
  const trackRef = useRef<HTMLUListElement>(null);

  if (!items.length) return null;

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <section aria-labelledby="profile-media-heading" className="mt-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2
          id="profile-media-heading"
          className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground"
        >
          Media gallery
        </h2>
        <div className="hidden gap-2 sm:flex">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Scroll media gallery left"
            className="grid h-11 w-11 place-items-center rounded-full border border-border text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Scroll media gallery right"
            className="grid h-11 w-11 place-items-center rounded-full border border-border text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <ul
        ref={trackRef}
        aria-label={`Media by ${name}`}
        className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2"
      >
        {items.map((item) => (
          <li
            key={item.id}
            className="w-[70%] min-w-0 shrink-0 snap-start sm:w-[45%] lg:w-[32%]"
          >
            <GalleryTile item={item} name={name} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function GalleryTile({ item, name }: { item: GalleryItem; name: string }) {
  const mediaRef = useRef<HTMLVideoElement & HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const title = item.title || "Untitled";

  const toggle = () => {
    const el = mediaRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  const isVideo = item.media_type === "video";
  const isAudio = item.media_type === "audio";

  return (
    <figure className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="relative aspect-video bg-muted">
        {failed ? (
          <div
            role="img"
            aria-label={`Preview unavailable for ${title}`}
            className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground"
          >
            {isVideo ? (
              <Film className="h-5 w-5" aria-hidden="true" />
            ) : isAudio ? (
              <Music2 className="h-5 w-5" aria-hidden="true" />
            ) : (
              <ImageOff className="h-5 w-5" aria-hidden="true" />
            )}
            <span className="text-[10px] uppercase tracking-widest">Preview unavailable</span>
          </div>
        ) : isVideo ? (
          <video
            ref={mediaRef}
            src={item.media_url}
            poster={item.thumbnail_url ?? undefined}
            playsInline
            muted
            loop
            preload="metadata"
            onError={() => setFailed(true)}
            onEnded={() => setPlaying(false)}
            aria-label={`${title} by ${name}`}
            className="h-full w-full object-cover"
          />
        ) : isAudio ? (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/25 via-secondary/20 to-accent/20">
            <audio
              ref={mediaRef}
              src={item.media_url}
              preload="none"
              onError={() => setFailed(true)}
              onEnded={() => setPlaying(false)}
            />
            <Music2 className="h-8 w-8 text-foreground/70" aria-hidden="true" />
          </div>
        ) : (
          <img
            src={item.thumbnail_url || item.media_url}
            alt={`${title} by ${name}`}
            loading="lazy"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
          />
        )}

        {!failed && (isVideo || isAudio) && (
          <button
            type="button"
            onClick={toggle}
            aria-pressed={playing}
            aria-label={`${playing ? "Pause" : "Play"} ${title} by ${name}`}
            className="absolute bottom-2 right-2 grid h-11 w-11 place-items-center rounded-full bg-background/85 text-foreground backdrop-blur transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
        )}
      </div>
      <figcaption className="p-3">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{item.media_type}</p>
      </figcaption>
    </figure>
  );
}