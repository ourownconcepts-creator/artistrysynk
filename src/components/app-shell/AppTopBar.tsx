import type { ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { ChevronLeft, Sparkles } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { cn } from "@/lib/utils";
import { Pressable } from "@/components/native-ui";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "@/components/navbar/ThemeToggle";
import { GlobalSearch } from "@/components/navbar/GlobalSearch";

export function AppTopBar({
  title,
  back,
  right,
  transparent,
}: {
  title?: string;
  back?: boolean;
  right?: ReactNode;
  transparent?: boolean;
}) {
  const router = useRouter();

  return (
    <header
      className={cn(
        "sticky top-0 z-40",
        transparent ? "bg-transparent" : "app-blur border-b border-border/40",
      )}
    >
      <div className="mx-auto flex h-14 max-w-2xl items-center gap-2 px-3 lg:max-w-5xl">
        {back ? (
          <Pressable
            aria-label="Go back"
            onClick={() => router.history.back()}
            className="grid h-10 w-10 place-items-center rounded-full bg-surface-2"
          >
            <ChevronLeft className="h-5 w-5" />
          </Pressable>
        ) : (
          <Link to="/home" aria-label="ArtistrySynk home" className="shrink-0">
            <img src={logoImg} alt="ArtistrySynk" className="h-8 w-auto" />
          </Link>
        )}

        <div className="min-w-0 flex-1">
          {title ? (
            <h1 className="truncate text-[17px] font-semibold tracking-tight">{title}</h1>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {right}
          <GlobalSearch />
          <Link
            to="/synk-ai"
            aria-label="Synk AI assistant"
            className="grid h-10 w-10 place-items-center rounded-full text-primary hover:bg-surface-2"
          >
            <Sparkles className="h-5 w-5" />
          </Link>
          <NotificationBell />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}