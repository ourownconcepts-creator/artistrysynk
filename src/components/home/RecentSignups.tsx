import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface RecentUser {
  id: string;
  username: string;
  avatar_url: string | null;
  city: string | null;
  country: string | null;
  created_at: string | null;
}

export const RecentSignups = () => {
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);

  const loadRecent = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, city, country, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    if (data) setRecentUsers(data);
  };

  useEffect(() => {
    loadRecent();

    const channel = supabase
      .channel("recent-signups")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "profiles" },
        (payload) => {
          const newUser = payload.new as RecentUser;
          setRecentUsers((prev) => [newUser, ...prev].slice(0, 5));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (recentUsers.length === 0) return null;

  const getLocation = (user: RecentUser) => {
    if (user.city && user.country) return `${user.city}, ${user.country}`;
    if (user.city) return user.city;
    if (user.country) return user.country;
    return null;
  };

  const getTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return "just now";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <section className="py-10 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="relative">
              <UserPlus className="w-5 h-5 text-primary" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              Just Joined the Community
            </h3>
          </div>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
          <AnimatePresence mode="popLayout">
            {recentUsers.map((user, index) => {
              const location = getLocation(user);
              return (
                <motion.div
                  key={user.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  className="flex items-center gap-2.5 px-4 py-2.5 bg-card/80 backdrop-blur-sm rounded-full border border-border/50 hover:border-primary/50 hover:shadow-md hover:shadow-primary/10 transition-all duration-300"
                >
                  <Avatar className="w-7 h-7 border border-primary/20">
                    <AvatarImage
                      src={user.avatar_url || undefined}
                      alt={`${user.username} profile picture`}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground text-xs font-bold">
                      {user.username?.charAt(0)?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="font-semibold text-foreground">
                      @{user.username}
                    </span>
                    <span className="text-muted-foreground">signed up</span>
                    {location && (
                      <>
                        <span className="text-muted-foreground">from</span>
                        <span className="flex items-center gap-0.5 text-primary font-medium">
                          <MapPin className="w-3 h-3" />
                          {location}
                        </span>
                      </>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground/60 ml-1">
                    {getTimeAgo(user.created_at)}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};
