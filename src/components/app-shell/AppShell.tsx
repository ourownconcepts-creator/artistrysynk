import { useEffect, useState, type ReactNode } from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAppUser } from "@/hooks/useAppUser";
import { PullToRefresh, useReducedMotion } from "@/components/native-ui";
import { AppTopBar } from "./AppTopBar";
import { BottomNav } from "./BottomNav";
import { DesktopRail } from "./DesktopRail";
import { CreateSheet } from "./CreateSheet";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: ReactNode;
  title?: string;
  back?: boolean;
  right?: ReactNode;
  /** Full-bleed screens (swipe deck, chat thread) skip the content padding. */
  bleed?: boolean;
  hideTopBar?: boolean;
  className?: string;
};

/**
 * Persistent application shell: top bar, scrollable content, floating create
 * action and bottom tab bar (mobile) / side rail (desktop).
 */
export function AppShell({
  children,
  title,
  back,
  right,
  bleed,
  hideTopBar,
  className,
}: AppShellProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const { user } = useAppUser();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const reduced = useReducedMotion();

  // Live unread message counter for the Inbox tab.
  useEffect(() => {
    if (!user) return;
    let active = true;

    const load = async () => {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("read", false)
        .neq("sender_id", user.id);
      if (active) setUnread(count ?? 0);
    };

    void load();
    const channel = supabase
      .channel("shell-unread")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => void load())
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex w-full max-w-[1500px]">
        <DesktopRail onCreate={() => setCreateOpen(true)} />

        <div className="min-w-0 flex-1">
          {hideTopBar ? null : <AppTopBar title={title} back={back} right={right} />}

          <PullToRefresh onRefresh={() => router.invalidate()}>
            <motion.main
              key={pathname}
              initial={reduced ? undefined : { opacity: 0, y: 6 }}
              animate={reduced ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className={cn(
                "app-scroll mx-auto w-full max-w-2xl pb-[calc(var(--app-tabbar-h)+2.5rem)] lg:max-w-5xl lg:pb-10",
                bleed ? "px-0" : "px-4 pt-3",
                className,
              )}
            >
              {children}
            </motion.main>
          </PullToRefresh>
        </div>
      </div>

      <BottomNav unread={unread} onCreate={() => setCreateOpen(true)} />
      <CreateSheet open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}