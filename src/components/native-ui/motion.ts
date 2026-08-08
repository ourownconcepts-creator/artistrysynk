import { useEffect, useState } from "react";

/** Respects the OS "reduce motion" setting. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export const springSoft = { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.7 };
export const springSnappy = { type: "spring" as const, stiffness: 620, damping: 30, mass: 0.6 };

export const listItemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: Math.min(i * 0.035, 0.4), ...springSoft },
  }),
};

/** Light haptic feedback where the platform supports it. */
export function haptic(pattern: number | number[] = 8) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    /* no-op */
  }
}