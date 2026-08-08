import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Music2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Pressable } from "./Pressable";

type MediaTileProps = {
  url?: string | null;
  thumbnail?: string | null;
  type?: string | null;
  title?: string | null;
  onClick?: () => void;
  className?: string;
};

/** Progressive-loading media tile for masonry / grid galleries. */
export function MediaTile({ url, thumbnail, type, title, onClick, className }: MediaTileProps) {
  const [loaded, setLoaded] = useState(false);
  const src = thumbnail || (type === "image" ? url : null);

  return (
    <Pressable
      onClick={onClick}
      lift
      aria-label={title ? `Open ${title}` : "Open media"}
      className={cn("group relative w-full overflow-hidden rounded-2xl bg-surface-3", className)}
    >
      {src ? (
        <motion.img
          src={src}
          alt={title ?? ""}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          initial={{ opacity: 0 }}
          animate={{ opacity: loaded ? 1 : 0 }}
          transition={{ duration: 0.35 }}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="grid h-full w-full place-items-center text-muted-foreground">
          {type === "audio" ? (
            <Music2 className="h-6 w-6" />
          ) : type === "video" ? (
            <Play className="h-6 w-6" />
          ) : (
            <ImageIcon className="h-6 w-6" />
          )}
        </div>
      )}
      {type && type !== "image" ? (
        <span className="absolute bottom-2 left-2 grid h-7 w-7 place-items-center rounded-full bg-black/55 text-white backdrop-blur">
          {type === "audio" ? <Music2 className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </span>
      ) : null}
      {title ? (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-left text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
          {title}
        </span>
      ) : null}
    </Pressable>
  );
}