import { useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Loader2, ArrowDown } from "lucide-react";
import { haptic, useReducedMotion } from "./motion";

type PullToRefreshProps = {
  onRefresh: () => Promise<unknown> | void;
  children: ReactNode;
};

const THRESHOLD = 72;

/** Touch pull-to-refresh for the app shell content area. */
export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const startY = useRef<number | null>(null);
  const reduced = useReducedMotion();

  const atTop = () =>
    typeof window !== "undefined" && (window.scrollY ?? 0) <= 0;

  return (
    <div
      onTouchStart={(e) => {
        if (busy || !atTop()) return;
        startY.current = e.touches[0]?.clientY ?? null;
      }}
      onTouchMove={(e) => {
        if (startY.current == null || busy) return;
        const dy = (e.touches[0]?.clientY ?? 0) - startY.current;
        if (dy > 0 && atTop()) setPull(Math.min(dy * 0.5, 110));
      }}
      onTouchEnd={async () => {
        const shouldRefresh = pull >= THRESHOLD;
        startY.current = null;
        setPull(0);
        if (!shouldRefresh || busy) return;
        haptic(12);
        setBusy(true);
        try {
          await onRefresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      <motion.div
        animate={{ height: busy ? 44 : pull }}
        transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }}
        className="flex items-end justify-center overflow-hidden"
      >
        <div className="pb-2 text-muted-foreground">
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <ArrowDown
              className="h-5 w-5 transition-transform"
              style={{ transform: `rotate(${pull >= THRESHOLD ? 180 : 0}deg)` }}
            />
          )}
        </div>
      </motion.div>
      {children}
    </div>
  );
}