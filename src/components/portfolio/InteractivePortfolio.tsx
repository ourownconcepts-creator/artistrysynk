import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Play,
  Pause,
  Music2,
  Video as VideoIcon,
  ImageIcon,
  FileText,
  Trash2,
  Flag,
  Maximize2,
  ExternalLink,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { EmptyState, Pressable, SkeletonTiles, Surface } from "@/components/native-ui";
import { haptic } from "@/components/native-ui/motion";
import { FlagContentDialog } from "@/components/FlagContentDialog";
import { openExternalUrl } from "@/lib/nativeMedia";

export interface PortfolioItem {
  id: string;
  title: string;
  description: string | null;
  media_type: string;
  media_url: string;
  thumbnail_url?: string | null;
  created_at: string | null;
}

const typeIcon = (type: string) =>
  type === "audio" ? Music2 : type === "video" ? VideoIcon : type === "image" ? ImageIcon : FileText;

/**
 * Interactive portfolio grid: inline play/pause previews for audio + video,
 * and a full-screen viewer for larger media.
 */
export function InteractivePortfolio({
  userId,
  editable = false,
  showReportButton = false,
}: {
  userId: string;
  editable?: boolean;
  showReportButton?: boolean;
}) {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [viewer, setViewer] = useState<PortfolioItem | null>(null);
  const mediaRefs = useRef<Record<string, HTMLMediaElement | null>>({});

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("portfolio_items")
      .select("id, title, description, media_type, media_url, thumbnail_url, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load portfolio");
    setItems(data ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Keep only one preview playing at a time.
  const togglePlay = (item: PortfolioItem) => {
    haptic(8);
    const el = mediaRefs.current[item.id];
    if (!el) return;

    if (playingId && playingId !== item.id) {
      const prev = mediaRefs.current[playingId];
      prev?.pause();
    }

    if (el.paused) {
      void el.play().catch(() => toast.error("Preview could not play"));
      setPlayingId(item.id);
    } else {
      el.pause();
      setPlayingId(null);
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("portfolio_items").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete item");
      return;
    }
    toast.success("Item deleted");
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const openViewer = (item: PortfolioItem) => {
    mediaRefs.current[item.id]?.pause();
    setPlayingId(null);
    setViewer(item);
  };

  if (loading) return <SkeletonTiles />;

  if (!items.length) {
    return (
      <EmptyState
        icon={<ImageIcon className="h-6 w-6" />}
        title="No work yet"
        description="Upload tracks, reels, images or docs so collaborators can hear and see what you do."
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item) => {
          const Icon = typeIcon(item.media_type);
          const isPlaying = playingId === item.id;
          const isPlayable = item.media_type === "audio" || item.media_type === "video";

          return (
            <Surface key={item.id} level={2} className="overflow-hidden">
              <div className="relative aspect-square bg-surface-3">
                {item.media_type === "image" ? (
                  <img
                    src={item.media_url}
                    alt={item.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : item.media_type === "video" ? (
                  <video
                    ref={(el) => {
                      mediaRefs.current[item.id] = el;
                    }}
                    src={item.media_url}
                    poster={item.thumbnail_url ?? undefined}
                    playsInline
                    muted
                    loop
                    preload="metadata"
                    onEnded={() => setPlayingId(null)}
                    className="h-full w-full object-cover"
                  />
                ) : item.media_type === "audio" ? (
                  <>
                    <audio
                      ref={(el) => {
                        mediaRefs.current[item.id] = el;
                      }}
                      src={item.media_url}
                      preload="metadata"
                      onEnded={() => setPlayingId(null)}
                    />
                    <div
                      className="grid h-full w-full place-items-center"
                      style={{ backgroundImage: "var(--gradient-primary)" }}
                    >
                      <Music2 className="h-8 w-8 text-primary-foreground/80" />
                    </div>
                  </>
                ) : (
                  <div className="grid h-full w-full place-items-center">
                    <Icon className="h-10 w-10 text-muted-foreground/50" />
                  </div>
                )}

                {/* Inline play / pause */}
                {isPlayable ? (
                  <Pressable
                    onClick={() => togglePlay(item)}
                    aria-label={`${isPlaying ? "Pause" : "Play"} ${item.title}`}
                    className="absolute bottom-2 left-2 grid h-10 w-10 place-items-center rounded-full bg-black/60 text-white backdrop-blur"
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={isPlaying ? "pause" : "play"}
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.6, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        {isPlaying ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4 translate-x-[1px]" />
                        )}
                      </motion.span>
                    </AnimatePresence>
                  </Pressable>
                ) : null}

                {isPlaying ? (
                  <span className="absolute bottom-3 left-14 flex items-end gap-0.5" aria-hidden>
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="w-1 rounded-full bg-white"
                        animate={{ height: [4, 14, 6, 12, 4] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </span>
                ) : null}

                {/* Enlarge */}
                <Pressable
                  onClick={() => openViewer(item)}
                  aria-label={`View ${item.title} larger`}
                  className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white backdrop-blur"
                >
                  <Maximize2 className="h-4 w-4" />
                </Pressable>

                <Badge variant="secondary" className="absolute left-2 top-2 text-[10px] capitalize">
                  {item.media_type}
                </Badge>
              </div>

              <div className="flex items-start gap-2 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  {item.description ? (
                    <p className="truncate text-xs text-muted-foreground">{item.description}</p>
                  ) : null}
                </div>
                {editable ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    aria-label={`Delete ${item.title}`}
                    onClick={() => void remove(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
                {showReportButton ? (
                  <FlagContentDialog
                    contentType="portfolio"
                    contentId={item.id}
                    trigger={
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground"
                        aria-label={`Report ${item.title}`}
                      >
                        <Flag className="h-4 w-4" />
                      </Button>
                    }
                  />
                ) : null}
              </div>
            </Surface>
          );
        })}
      </div>

      {/* Large media viewer */}
      <AnimatePresence>
        {viewer ? (
          <motion.div
            className="fixed inset-0 z-[70] flex flex-col bg-black/95 p-4 pb-[max(1rem,var(--safe-area-bottom))] pt-[max(1rem,var(--safe-area-top))]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label={viewer.title}
          >
            <div className="flex items-center justify-between text-white">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{viewer.title}</p>
                {viewer.description ? (
                  <p className="truncate text-xs text-white/60">{viewer.description}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Pressable
                  onClick={() => void openExternalUrl(viewer.media_url)}
                  aria-label="Open original"
                  className="grid h-10 w-10 place-items-center rounded-full bg-white/10"
                >
                  <ExternalLink className="h-4 w-4" />
                </Pressable>
                <Pressable
                  onClick={() => setViewer(null)}
                  aria-label="Close viewer"
                  className="grid h-10 w-10 place-items-center rounded-full bg-white/10"
                >
                  <X className="h-4 w-4" />
                </Pressable>
              </div>
            </div>

            <div className="flex flex-1 items-center justify-center overflow-hidden py-4">
              {viewer.media_type === "image" ? (
                <img
                  src={viewer.media_url}
                  alt={viewer.title}
                  className="max-h-full max-w-full rounded-2xl object-contain"
                />
              ) : viewer.media_type === "video" ? (
                <video
                  src={viewer.media_url}
                  poster={viewer.thumbnail_url ?? undefined}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-full w-full rounded-2xl"
                />
              ) : viewer.media_type === "audio" ? (
                <div className="w-full max-w-md space-y-6 text-center">
                  <div
                    className="mx-auto grid h-40 w-40 place-items-center rounded-3xl"
                    style={{ backgroundImage: "var(--gradient-primary)" }}
                  >
                    <Music2 className="h-14 w-14 text-primary-foreground/90" />
                  </div>
                  <audio src={viewer.media_url} controls autoPlay className="w-full" />
                </div>
              ) : (
                <Button
                  onClick={() => void openExternalUrl(viewer.media_url)}
                  className="rounded-full"
                >
                  Open file
                </Button>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
