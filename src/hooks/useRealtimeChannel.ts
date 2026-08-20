import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type RealtimeStatus = "connecting" | "connected" | "reconnecting" | "offline";

type Options = {
  /** Stable channel name; pass null to stay disconnected. */
  name: string | null;
  /** Attach listeners; called again on every (re)subscribe. */
  setup: (channel: RealtimeChannel) => RealtimeChannel;
  /** Called after a successful re-subscribe so callers can refetch missed rows. */
  onReconnect?: () => void;
  /**
   * Subscribe as a private channel so broadcast/presence traffic is authorized
   * by RLS policies on `realtime.messages` instead of being world-readable.
   */
  private?: boolean;
};

const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 15_000;

/**
 * Realtime channel with graceful reconnection: chat and project rooms survive
 * transient drops (sleep/wake, network switch, server restart) by resubscribing
 * with exponential backoff and refetching state once the channel is live again.
 */
export function useRealtimeChannel({ name, setup, onReconnect, private: isPrivate }: Options): RealtimeStatus {
  const [status, setStatus] = useState<RealtimeStatus>("connecting");
  const setupRef = useRef(setup);
  const reconnectRef = useRef(onReconnect);
  setupRef.current = setup;
  reconnectRef.current = onReconnect;

  useEffect(() => {
    if (!name) return;

    let disposed = false;
    let channel: RealtimeChannel | null = null;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let hasConnectedOnce = false;

    const clearTimer = () => {
      if (timer) clearTimeout(timer);
      timer = undefined;
    };

    const teardown = () => {
      clearTimer();
      if (channel) {
        void supabase.removeChannel(channel);
        channel = null;
      }
    };

    const scheduleReconnect = () => {
      if (disposed || timer) return;
      setStatus(hasConnectedOnce ? "reconnecting" : "connecting");
      const delay = Math.min(BASE_DELAY_MS * 2 ** attempts, MAX_DELAY_MS);
      attempts += 1;
      timer = setTimeout(() => {
        timer = undefined;
        connect();
      }, delay + Math.random() * 250);
    };

    const connect = () => {
      if (disposed) return;
      teardown();
      const next = setupRef.current(
        isPrivate ? supabase.channel(name, { config: { private: true } }) : supabase.channel(name),
      );
      channel = next;
      next.subscribe((state) => {
        if (disposed) return;
        if (state === "SUBSCRIBED") {
          const recovered = hasConnectedOnce;
          attempts = 0;
          hasConnectedOnce = true;
          setStatus("connected");
          if (recovered) reconnectRef.current?.();
          return;
        }
        if (state === "CHANNEL_ERROR" || state === "TIMED_OUT" || state === "CLOSED") {
          setStatus(hasConnectedOnce ? "reconnecting" : "connecting");
          scheduleReconnect();
        }
      });
    };

    const resumeNow = () => {
      if (disposed) return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        setStatus("offline");
        return;
      }
      attempts = 0;
      clearTimer();
      connect();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible" && status !== "connected") resumeNow();
    };
    const handleOffline = () => setStatus("offline");

    connect();
    window.addEventListener("online", resumeNow);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      disposed = true;
      window.removeEventListener("online", resumeNow);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
      teardown();
    };
    // `status` is intentionally excluded: it would recreate the channel on every state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, isPrivate]);

  return status;
}
