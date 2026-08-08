import { Home, Search, MessageCircle, User, Plus } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { haptic, useReducedMotion } from "@/components/native-ui";

export type TabKey = "home" | "discover" | "inbox" | "profile";

const TABS: { key: TabKey; label: string; to: string; icon: typeof Home }[] = [
  { key: "home", label: "Home", to: "/home", icon: Home },
  { key: "discover", label: "Discover", to: "/discover", icon: Search },
  { key: "inbox", label: "Inbox", to: "/messages", icon: MessageCircle },
  { key: "profile", label: "Profile", to: "/profile", icon: User },
];

function isActive(pathname: string, to: string) {
  if (to === "/home") return pathname === "/home";
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function BottomNav({
  unread = 0,
  onCreate,
}: {
  unread?: number;
  onCreate: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const reduced = useReducedMotion();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 lg:hidden"
      style={{ paddingBottom: "var(--safe-area-bottom)" }}
    >
      <div className="app-blur border-t border-border/40">
        <ul className="mx-auto grid max-w-lg grid-cols-5 items-center px-2">
          {TABS.slice(0, 2).map((tab) => (
            <TabItem key={tab.key} {...tab} active={isActive(pathname, tab.to)} reduced={reduced} />
          ))}
          <li className="flex justify-center">
            <button
              type="button"
              onClick={() => {
                haptic(10);
                onCreate();
              }}
              aria-label="Create"
              className="-mt-6 grid h-14 w-14 place-items-center rounded-[22px] text-primary-foreground shadow-fab transition-transform active:scale-95"
              style={{ backgroundImage: "var(--gradient-primary)" }}
            >
              <Plus className="h-7 w-7" />
            </button>
          </li>
          {TABS.slice(2).map((tab) => (
            <TabItem
              key={tab.key}
              {...tab}
              badge={tab.key === "inbox" ? unread : 0}
              active={isActive(pathname, tab.to)}
              reduced={reduced}
            />
          ))}
        </ul>
      </div>
    </nav>
  );
}

function TabItem({
  label,
  to,
  icon: Icon,
  active,
  badge = 0,
  reduced,
}: {
  label: string;
  to: string;
  icon: typeof Home;
  active: boolean;
  badge?: number;
  reduced: boolean;
}) {
  return (
    <li>
      <Link
        to={to}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        onClick={() => haptic(6)}
        className={cn(
          "relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[10px] font-medium transition-colors",
          active ? "text-primary" : "text-muted-foreground",
        )}
      >
        <span className="relative">
          <Icon className={cn("h-[22px] w-[22px]", active && "stroke-[2.4]")} />
          {badge > 0 ? (
            <span className="absolute -right-2 -top-1.5 grid min-w-4 place-items-center rounded-full bg-secondary px-1 text-[9px] font-bold text-secondary-foreground">
              {badge > 9 ? "9+" : badge}
            </span>
          ) : null}
        </span>
        {label}
        {active ? (
          <motion.span
            layoutId="tab-indicator"
            transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 34 }}
            className="absolute -top-px h-0.5 w-8 rounded-full bg-primary"
          />
        ) : null}
      </Link>
    </li>
  );
}