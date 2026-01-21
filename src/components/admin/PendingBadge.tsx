import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PendingBadgeProps {
  count: number;
  className?: string;
}

export const PendingBadge = ({ count, className }: PendingBadgeProps) => {
  if (count === 0) return null;

  return (
    <Badge 
      variant="destructive" 
      className={cn(
        "ml-1.5 h-5 min-w-5 px-1.5 text-xs font-bold rounded-full",
        count > 99 && "px-1",
        className
      )}
    >
      {count > 99 ? "99+" : count}
    </Badge>
  );
};
