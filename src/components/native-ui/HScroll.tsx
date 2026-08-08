import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Edge-to-edge horizontal snapping carousel row. */
export function HScroll({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("snap-row -mx-4 px-4", className)} role="list">
      {children}
    </div>
  );
}