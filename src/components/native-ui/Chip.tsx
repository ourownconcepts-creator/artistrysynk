import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Pressable } from "./Pressable";

type ChipProps = {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
  className?: string;
  "aria-label"?: string;
};

/** Filter / category chip. */
export function Chip({ children, active, onClick, icon, className, ...rest }: ChipProps) {
  return (
    <Pressable
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-app-sm"
          : "bg-surface-2 text-muted-foreground hover:text-foreground",
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </Pressable>
  );
}