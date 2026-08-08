import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { haptic, springSnappy, useReducedMotion } from "./motion";

type PressableProps = HTMLMotionProps<"button"> & {
  /** Slightly lift the element on hover (cards). */
  lift?: boolean;
  /** Fire haptic feedback on tap where available. */
  withHaptics?: boolean;
};

/**
 * Base tappable surface: compresses on press like a native control.
 */
export const Pressable = forwardRef<HTMLButtonElement, PressableProps>(
  ({ className, lift, withHaptics = true, onClick, ...props }, ref) => {
    const reduced = useReducedMotion();
    return (
      <motion.button
        ref={ref}
        type="button"
        whileTap={reduced ? undefined : { scale: 0.965 }}
        whileHover={reduced || !lift ? undefined : { y: -2 }}
        transition={springSnappy}
        onClick={(e) => {
          if (withHaptics) haptic(6);
          onClick?.(e);
        }}
        className={cn(
          "relative select-none outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          className,
        )}
        {...props}
      />
    );
  },
);
Pressable.displayName = "Pressable";