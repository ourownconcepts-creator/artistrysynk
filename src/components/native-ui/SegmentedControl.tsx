import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { haptic, springSnappy, useReducedMotion } from "./motion";

export type Segment = { key: string; label: string; icon?: React.ReactNode };

/** iOS-style segmented control for switching views inside a screen. */
export function SegmentedControl({
  segments,
  value,
  onChange,
  layoutId = "segment-pill",
  className,
  ariaLabel = "View",
}: {
  segments: Segment[];
  value: string;
  onChange: (key: string) => void;
  layoutId?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("flex gap-1 rounded-full bg-surface-2 p-1", className)}
    >
      {segments.map((s) => {
        const active = s.key === value;
        return (
          <button
            key={s.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => {
              haptic(6);
              onChange(s.key);
            }}
            className={cn(
              "relative flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors",
              active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active ? (
              <motion.span
                layoutId={layoutId}
                transition={reduced ? { duration: 0 } : springSnappy}
                className="absolute inset-0 rounded-full shadow-app-sm"
                style={{ backgroundImage: "var(--gradient-primary)" }}
              />
            ) : null}
            <span className="relative flex items-center gap-1.5">
              {s.icon}
              {s.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
