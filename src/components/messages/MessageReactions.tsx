import { SmilePlus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export const REACTION_EMOJI = ["🔥", "❤️", "😂", "👏", "🎧", "💡"] as const;

export type Reaction = { id: string; message_id: string; user_id: string; emoji: string };

/** Emoji reactions row plus picker for a single chat message. */
export function MessageReactions({
  reactions,
  currentUserId,
  align,
  onToggle,
}: {
  reactions: Reaction[];
  currentUserId: string | null;
  align: "start" | "end";
  onToggle: (emoji: string) => void;
}) {
  const grouped = reactions.reduce<Record<string, Reaction[]>>((acc, r) => {
    (acc[r.emoji] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className={cn("mt-1 flex items-center gap-1", align === "end" ? "justify-end" : "justify-start")}>
      {Object.entries(grouped).map(([emoji, list]) => {
        const mine = list.some((r) => r.user_id === currentUserId);
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onToggle(emoji)}
            aria-label={`${mine ? "Remove" : "Add"} ${emoji} reaction`}
            className={cn(
              "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] transition-colors",
              mine ? "border-primary/50 bg-primary/10 text-foreground" : "border-border/60 bg-surface-2 text-muted-foreground",
            )}
          >
            <span>{emoji}</span>
            <span className="tabular-nums">{list.length}</span>
          </button>
        );
      })}

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Add a reaction"
            className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-surface-2"
          >
            <SmilePlus className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent align={align} className="w-auto rounded-full p-1.5">
          <div className="flex gap-1">
            {REACTION_EMOJI.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onToggle(emoji)}
                aria-label={`React with ${emoji}`}
                className="grid h-8 w-8 place-items-center rounded-full text-base hover:bg-surface-2"
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}