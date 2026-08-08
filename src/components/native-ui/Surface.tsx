import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type SurfaceProps = HTMLAttributes<HTMLDivElement> & {
  level?: 1 | 2 | 3;
  inset?: boolean;
  glass?: boolean;
};

/** Borderless layered card surface — the base of every app module. */
export const Surface = forwardRef<HTMLDivElement, SurfaceProps>(
  ({ className, level = 1, inset, glass, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-3xl",
        level === 1 && "bg-surface-1 shadow-app-sm",
        level === 2 && "bg-surface-2",
        level === 3 && "bg-surface-3",
        glass && "app-blur shadow-app",
        inset && "p-4",
        className,
      )}
      {...props}
    />
  ),
);
Surface.displayName = "Surface";