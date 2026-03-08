import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SmilePlus } from "lucide-react";
import { cn } from "@/lib/utils";

const REACTION_EMOJIS = [
  { type: "fire", emoji: "🔥", label: "Fire" },
  { type: "clap", emoji: "👏", label: "Clap" },
  { type: "idea", emoji: "💡", label: "Idea" },
  { type: "heart", emoji: "❤️", label: "Love" },
  { type: "star", emoji: "⭐", label: "Star" },
  { type: "rocket", emoji: "🚀", label: "Rocket" },
];

interface PostReactionsProps {
  postId: string;
  currentUserId: string;
  reactions: Record<string, { count: number; reacted: boolean }>;
  onReactionChange: (postId: string, reactionType: string, added: boolean) => void;
}

export const PostReactions = ({ postId, currentUserId, reactions, onReactionChange }: PostReactionsProps) => {
  const [open, setOpen] = useState(false);

  const toggleReaction = async (reactionType: string) => {
    const existing = reactions[reactionType];
    if (existing?.reacted) {
      await supabase
        .from("collaboration_post_reactions")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", currentUserId)
        .eq("reaction_type", reactionType);
      onReactionChange(postId, reactionType, false);
    } else {
      await supabase
        .from("collaboration_post_reactions")
        .insert({ post_id: postId, user_id: currentUserId, reaction_type: reactionType });
      onReactionChange(postId, reactionType, true);
    }
    setOpen(false);
  };

  const activeReactions = REACTION_EMOJIS.filter(r => (reactions[r.type]?.count || 0) > 0);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {activeReactions.map(r => (
        <Button
          key={r.type}
          variant="outline"
          size="sm"
          className={cn(
            "h-7 px-2 text-xs gap-1 rounded-full",
            reactions[r.type]?.reacted && "border-primary bg-primary/10"
          )}
          onClick={() => toggleReaction(r.type)}
        >
          {r.emoji} {reactions[r.type]?.count}
        </Button>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-full text-muted-foreground">
            <SmilePlus className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" side="top">
          <div className="flex gap-1">
            {REACTION_EMOJIS.map(r => (
              <Button
                key={r.type}
                variant="ghost"
                size="sm"
                className={cn("h-8 w-8 p-0 text-lg hover:scale-125 transition-transform", reactions[r.type]?.reacted && "bg-primary/10")}
                onClick={() => toggleReaction(r.type)}
                title={r.label}
              >
                {r.emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
