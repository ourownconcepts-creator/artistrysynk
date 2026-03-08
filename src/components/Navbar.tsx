import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, Compass, MessageCircle, User, LogOut, Briefcase, Store, Users, FolderOpen, Code, Settings, Rss, Award } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "@/components/navbar/ThemeToggle";
import { GlobalSearch } from "@/components/navbar/GlobalSearch";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";

export const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const { isStudio } = useSubscription();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        loadProfile(user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    setProfile(data);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  const isActive = (path: string) => location.pathname === path;

  if (!user) return null;

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/discover" className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-secondary" />
            <span className="font-bold text-xl bg-gradient-to-r from-secondary via-accent to-primary bg-clip-text text-transparent">
              ArtistrySynk
            </span>
          </Link>

          <div className="flex items-center gap-6">
            <Link to="/discover">
              <Button
                variant={isActive("/discover") ? "default" : "ghost"}
                size="sm"
                className="gap-2"
              >
                <Compass className="w-4 h-4" />
                Discover
              </Button>
            </Link>

            <Link to="/matches">
              <Button
                variant={isActive("/matches") ? "default" : "ghost"}
                size="sm"
                className="gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Matches
              </Button>
            </Link>

            <Link to="/jobs">
              <Button
                variant={isActive("/jobs") ? "default" : "ghost"}
                size="sm"
                className="gap-2"
              >
                <Briefcase className="w-4 h-4" />
                Jobs
              </Button>
            </Link>

            <GlobalSearch />
            
            {user && <NotificationBell userId={user.id} />}
            
            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar>
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback>
                      {profile?.full_name?.charAt(0) || <User className="w-4 h-4" />}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/projects")}>
                  <FolderOpen className="w-4 h-4 mr-2" />
                  My Projects
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/open-projects")}>
                  <Briefcase className="w-4 h-4 mr-2" />
                  Open Projects
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/marketplace")}>
                  <Store className="w-4 h-4 mr-2" />
                  Marketplace
                </DropdownMenuItem>
                {isStudio && (
                  <>
                    <DropdownMenuItem onClick={() => navigate("/teams")}>
                      <Users className="w-4 h-4 mr-2" />
                      Teams
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/api-access")}>
                      <Code className="w-4 h-4 mr-2" />
                      API Access
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      
      {user && <OnboardingTour userId={user.id} />}
    </nav>
  );
};
