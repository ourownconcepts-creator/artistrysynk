import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Search,
  MessageCircle,
  User,
  Plus,
  Rss,
  Briefcase,
  Store,
  FolderOpen,
  Heart,
  Sparkles,
  Settings,
  Building2,
} from "lucide-react";
import logoImg from "@/assets/logo.png";
import { cn } from "@/lib/utils";
import { useMyStudios } from "@/hooks/useMyStudios";

const PRIMARY = [
  { label: "Home", to: "/home", icon: Home },
  { label: "Discover", to: "/discover", icon: Search },
  { label: "Inbox", to: "/messages", icon: MessageCircle },
  { label: "Matches", to: "/matches", icon: Heart },
  { label: "Feed", to: "/feed", icon: Rss },
];

const SECONDARY = [
  { label: "Opportunities", to: "/jobs", icon: Briefcase },
  { label: "Marketplace", to: "/marketplace", icon: Store },
  { label: "Projects", to: "/projects", icon: FolderOpen },
  { label: "Synk AI", to: "/synk-ai", icon: Sparkles },
  { label: "Profile", to: "/profile", icon: User },
  { label: "Settings", to: "/settings", icon: Settings },
];

export function DesktopRail({ onCreate }: { onCreate: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { primary, canManagePrimary } = useMyStudios();

  // One Studio entry: management for members who have a studio, the public
  // directory for everyone else. Management links are never shown to members
  // whose role cannot manage.
  const studioEntry = primary
    ? {
        label: canManagePrimary ? "My Studio" : primary.studio.name,
        to: canManagePrimary ? `/studios/${primary.studio.handle}/manage` : `/studios/${primary.studio.handle}`,
        icon: Building2,
      }
    : { label: "Studios", to: "/studios", icon: Building2 };

  const item = (entry: { label: string; to: string; icon: typeof Home }) => {
    const active = pathname === entry.to || pathname.startsWith(`${entry.to}/`);
    return (
      <Link
        key={entry.to}
        to={entry.to}
        className={cn(
          "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors",
          active
            ? "bg-primary/12 text-primary"
            : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
        )}
      >
        <entry.icon className="h-[18px] w-[18px]" />
        {entry.label}
      </Link>
    );
  };

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 border-r border-border/40 px-3 py-4 lg:flex">
      <Link to="/home" className="mb-4 px-2" aria-label="ArtistrySynk home">
        <img src={logoImg} alt="ArtistrySynk" className="h-[4.5rem] w-auto" />
      </Link>
      <nav aria-label="Main" className="flex flex-col gap-1">
        {PRIMARY.map(item)}
      </nav>
      <button
        type="button"
        onClick={onCreate}
        className="mt-3 flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold text-primary-foreground shadow-fab transition-transform active:scale-[0.98]"
        style={{ backgroundImage: "var(--gradient-primary)" }}
      >
        <Plus className="h-4 w-4" /> Create
      </button>
      <div className="my-3 h-px bg-border/50" />
      <nav aria-label="More" className="flex flex-col gap-1">
        {[...SECONDARY.slice(0, 3), studioEntry, ...SECONDARY.slice(3)].map(item)}
      </nav>
    </aside>
  );
}