import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Users, Briefcase, Music, Handshake, Globe, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StatItem {
  icon: React.ReactNode;
  value: number;
  suffix: string;
  label: string;
  color: string;
}

const toNumber = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const AnimatedNumber = ({ value, suffix }: { value: number; suffix: string }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const target = Math.max(0, toNumber(value));

    if (target === 0) {
      setCount(0);
      return;
    }

    let frameId = 0;
    let startTime: number | null = null;
    const duration = 1800;

    const animate = (currentTime: number) => {
      if (startTime === null) {
        startTime = currentTime;
      }

      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.round(easeOutQuart * target));

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frameId);
  }, [value]);

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(num >= 10000 ? 0 : 1) + "K";
    }
    return num.toString();
  };

  return (
    <span className="tabular-nums">
      {formatNumber(count)}{suffix}
    </span>
  );
};

// Simple in-memory cache for stats
let statsCache: { data: Record<string, number>; ts: number } | null = null;
const CACHE_TTL = 60_000; // 1 minute

export const StatsCounter = () => {
  const [stats, setStats] = useState<StatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const buildStats = useCallback((d: Record<string, unknown>) => {
    const items: StatItem[] = [
      { icon: <Users className="w-8 h-8" />, value: toNumber(d.users), suffix: "+", label: "Creative Professionals", color: "from-primary to-primary/50" },
      { icon: <FolderOpen className="w-8 h-8" />, value: toNumber(d.projects), suffix: "+", label: "Projects Created", color: "from-secondary to-secondary/50" },
      { icon: <Music className="w-8 h-8" />, value: toNumber(d.portfolio_items), suffix: "+", label: "Portfolio Pieces", color: "from-accent to-accent/50" },
      { icon: <Handshake className="w-8 h-8" />, value: toNumber(d.matches), suffix: "+", label: "Matches Made", color: "from-primary to-secondary" },
      { icon: <Briefcase className="w-8 h-8" />, value: toNumber(d.services), suffix: "+", label: "Services Available", color: "from-secondary to-accent" },
      { icon: <Globe className="w-8 h-8" />, value: toNumber(d.countries), suffix: "+", label: "Countries Represented", color: "from-accent to-primary" },
    ];

    setStats(items.filter((stat) => stat.value > 0));
  }, []);

  const loadRealStats = useCallback(async (skipCache = false) => {
    // Return cached data if fresh
    if (!skipCache && statsCache && Date.now() - statsCache.ts < CACHE_TTL) {
      buildStats(statsCache.data);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc("get_platform_stats");
      if (error || !data) {
        console.error("Error loading stats:", error);
        setLoading(false);
        return;
      }
      const d = data as Record<string, number>;
      statsCache = { data: d, ts: Date.now() };
      buildStats(d);
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  }, [buildStats]);

  useEffect(() => {
    loadRealStats();

    // Debounced realtime refresh — wait 5s after last change before re-fetching
    const channel = supabase
      .channel("stats-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => loadRealStats(true), 5000);
      })
      .subscribe();

    return () => {
      clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [loadRealStats]);

  if (loading || stats.length === 0) {
    return null;
  }

  return (
    <section className="py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Our Growing Community
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Real numbers from real creatives — join a community that's growing every day
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group"
            >
              <div className="relative p-6 rounded-2xl bg-card/50 backdrop-blur-xs border border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 h-full">
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                
                <div className="relative z-10 flex flex-col items-center text-center">
                  <motion.div
                    className={`mb-4 p-3 rounded-xl bg-gradient-to-br ${stat.color} text-primary-foreground`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    {stat.icon}
                  </motion.div>
                  
                  <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                    <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                  </div>
                  
                  <p className="text-sm text-muted-foreground font-medium">
                    {stat.label}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
