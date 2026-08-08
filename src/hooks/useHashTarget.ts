import { useEffect } from "react";

/**
 * Scrolls to (and briefly highlights) the element matching the current URL
 * hash. Push-notification deep links land on /projects/:id#invites,
 * #role-approvals or #activity, and those sections only exist after the room
 * data has loaded — so this retries until the target mounts.
 */
export function useHashTarget(ready: boolean, allowed?: readonly string[]) {
  useEffect(() => {
    if (!ready || typeof window === "undefined") return;
    const id = window.location.hash.replace("#", "");
    if (!id) return;
    if (allowed && !allowed.includes(id)) return;

    let attempts = 0;
    let frame = 0;
    const tick = () => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.setAttribute("data-deeplink-target", "true");
        window.setTimeout(() => el.removeAttribute("data-deeplink-target"), 2400);
        return;
      }
      if (attempts++ < 40) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [ready, allowed]);
}

export const PROJECT_ROOM_SECTIONS = ["invites", "role-approvals", "activity"] as const;
