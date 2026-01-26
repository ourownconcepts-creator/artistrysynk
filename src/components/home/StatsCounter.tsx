import { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Users, Briefcase, Music, Star, Globe, Zap } from "lucide-react";

interface StatItem {
  icon: React.ReactNode;
  value: number;
  suffix: string;
  label: string;
  color: string;
}

const stats: StatItem[] = [
  { icon: <Users className="w-8 h-8" />, value: 50000, suffix: "+", label: "Creative Professionals", color: "from-primary to-primary/50" },
  { icon: <Briefcase className="w-8 h-8" />, value: 12000, suffix: "+", label: "Projects Completed", color: "from-secondary to-secondary/50" },
  { icon: <Music className="w-8 h-8" />, value: 8500, suffix: "+", label: "Songs Produced", color: "from-accent to-accent/50" },
  { icon: <Star className="w-8 h-8" />, value: 98, suffix: "%", label: "Satisfaction Rate", color: "from-primary to-secondary" },
  { icon: <Globe className="w-8 h-8" />, value: 120, suffix: "+", label: "Countries Reached", color: "from-secondary to-accent" },
  { icon: <Zap className="w-8 h-8" />, value: 5000, suffix: "+", label: "Daily Connections", color: "from-accent to-primary" },
];

const AnimatedNumber = ({ value, suffix, isInView }: { value: number; suffix: string; isInView: boolean }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    let startTime: number;
    const duration = 2000;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * value));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, isInView]);

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

export const StatsCounter = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-20 relative overflow-hidden">
      {/* Background pattern */}
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
            The Numbers Speak for Themselves
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join a thriving community of creatives making waves across the globe
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group"
            >
              <div className="relative p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 h-full">
                {/* Gradient glow on hover */}
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
                    <AnimatedNumber value={stat.value} suffix={stat.suffix} isInView={isInView} />
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
