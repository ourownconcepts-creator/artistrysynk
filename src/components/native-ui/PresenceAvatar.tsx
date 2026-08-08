import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type PresenceAvatarProps = {
  src?: string | null;
  name?: string | null;
  online?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  ring?: boolean;
};

const sizes = {
  sm: "h-9 w-9 text-[11px]",
  md: "h-11 w-11 text-xs",
  lg: "h-16 w-16 text-base",
  xl: "h-24 w-24 text-2xl",
};

export function PresenceAvatar({
  src,
  name,
  online,
  size = "md",
  className,
  ring,
}: PresenceAvatarProps) {
  const initials = (name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className={cn("relative shrink-0", className)}>
      <Avatar
        className={cn(
          sizes[size],
          ring && "ring-2 ring-primary/60 ring-offset-2 ring-offset-background",
        )}
      >
        {src ? <AvatarImage src={src} alt={name ?? "Profile photo"} loading="lazy" /> : null}
        <AvatarFallback className="bg-primary/10 font-semibold text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>
      {online ? (
        <span
          aria-label="Online"
          className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-emerald-500"
        />
      ) : null}
    </div>
  );
}