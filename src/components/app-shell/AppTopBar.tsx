import type { ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { ChevronLeft, Sparkles, User, Settings, LogOut, Building2 } from "lucide-react";
import logoImg from "@/assets/logo-mark.png";
import { cn } from "@/lib/utils";
import { Pressable } from "@/components/native-ui";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "@/components/navbar/ThemeToggle";
import { GlobalSearch } from "@/components/navbar/GlobalSearch";
import { useAppUser } from "@/hooks/useAppUser";
import { useMyStudios } from "@/hooks/useMyStudios";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

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
  const { user, profile } = useAppUser();
  const queryClient = useQueryClient();
  const { primary, canManagePrimary } = useMyStudios();

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    router.navigate({ to: "/auth", replace: true });
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40",
        transparent ? "bg-transparent" : "app-blur border-b border-border/40",
      )}
    >
      <div className="mx-auto flex h-16 max-w-2xl items-center gap-2 px-3 lg:max-w-5xl">
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
            <img src={logoImg} alt="ArtistrySynk" className="h-9 w-auto" />
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
          {user ? <NotificationBell userId={user.id} /> : null}
          <ThemeToggle />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Open account menu"
                  className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.full_name || "Your account"} />
                    <AvatarFallback>
                      {profile?.full_name?.charAt(0) || <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => router.navigate({ to: "/profile" })}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    router.navigate({
                      to: primary
                        ? canManagePrimary
                          ? `/studios/${primary.studio.handle}/manage`
                          : `/studios/${primary.studio.handle}`
                        : "/studios",
                    })
                  }
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  {primary ? (canManagePrimary ? "My Studio" : primary.studio.name) : "Studios"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.navigate({ to: "/settings" })}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
    </header>
  );
}