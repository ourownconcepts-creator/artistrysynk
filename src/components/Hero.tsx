import { lazy, Suspense, useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Users } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { MorphingBlobs } from './hero/MorphingBlobs';
import { SyncPulse } from './hero/SyncPulse';
import { AnimatedText, GlowText } from './hero/AnimatedText';
import { ThemeToggle } from './navbar/ThemeToggle';

const ConnectionWeb = lazy(() => import('./hero/ConnectionWeb').then(m => ({ default: m.ConnectionWeb })));

const subtitles = [
  "Find musicians, producers & creatives to collaborate with in minutes.",
  "Turn your talent into opportunities. Collaborate. Get discovered."
];

const RotatingSubtitle = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % subtitles.length);
    }, 45000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.p
      key={index}
      className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6 }}
    >
      {subtitles[index]}
    </motion.p>
  );
};

const FloatingBadge = ({ 
  children, 
  className, 
  delay = 0 
}: { 
  children: React.ReactNode; 
  className?: string; 
  delay?: number;
}) => (
  <motion.div
    className={`absolute px-4 py-2 rounded-full bg-card/80 backdrop-blur-sm border border-border/50 shadow-lg ${className}`}
    initial={{ opacity: 0, scale: 0.8, y: 20 }}
    animate={{ 
      opacity: 1, 
      scale: 1, 
      y: [0, -10, 0],
    }}
    transition={{
      opacity: { delay, duration: 0.5 },
      scale: { delay, duration: 0.5 },
      y: { delay: delay + 0.5, duration: 4, repeat: Infinity, ease: "easeInOut" }
    }}
  >
    {children}
  </motion.div>
);

export const Hero = () => {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 150]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);
  const scale = useTransform(scrollY, [0, 300], [1, 0.95]);

  return (
    <section className="relative min-h-[100vh] flex items-center justify-center overflow-hidden bg-background">
      {/* Theme toggle - fixed top right */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      {/* Layered backgrounds */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-secondary/5" />
      
      {/* Morphing background blobs */}
      <MorphingBlobs />
      
      {/* Sync pulse animation in center */}
      <motion.div style={{ opacity }} className="absolute inset-0">
        <SyncPulse />
      </motion.div>
      
      {/* Connection web - the star feature showing creatives connecting */}
      <Suspense fallback={null}>
        <motion.div style={{ opacity, scale }} className="absolute inset-0">
          <ConnectionWeb />
        </motion.div>
      </Suspense>

      {/* Animated grid pattern */}
      <motion.div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          y: y1
        }}
      />

      {/* Radial vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background)/0.8)_70%,hsl(var(--background))_100%)] pointer-events-none" />

      {/* Floating badges */}
      <FloatingBadge className="top-[15%] left-[8%] hidden lg:flex items-center gap-2" delay={1.5}>
        <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
        <span className="text-sm font-medium text-foreground">Live Collabs</span>
      </FloatingBadge>
      
      <FloatingBadge className="top-[20%] right-[10%] hidden lg:flex items-center gap-2" delay={2}>
        <Zap className="w-4 h-4 text-secondary" />
        <span className="text-sm font-medium text-foreground">Instant Match</span>
      </FloatingBadge>
      
      <FloatingBadge className="bottom-[25%] left-[12%] hidden lg:flex items-center gap-2" delay={2.5}>
        <Users className="w-4 h-4 text-accent" />
        <span className="text-sm font-medium text-foreground">Global Creatives</span>
      </FloatingBadge>

      {/* Main content */}
      <motion.div 
        className="relative z-10 container mx-auto px-4 py-20"
        style={{ y: y1, opacity }}
      >
        <div className="max-w-5xl mx-auto text-center space-y-8">
          
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-center gap-2"
          >
            <span className="px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary">
              ✨ The Creative Network
            </span>
          </motion.div>

          {/* Logo + headline */}
          <div className="space-y-4">
            <motion.div
              className="flex justify-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <img src={logoImg} alt="ArtistrySynk" className="h-40 w-auto" />
            </motion.div>
            
            <motion.h1 
              className="text-3xl sm:text-4xl md:text-5xl font-bold leading-[1.1] tracking-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              <span className="block">
                <GlowText className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  <AnimatedText delay={0.6}>Creatives Synk</AnimatedText>
                </GlowText>
              </span>
            </motion.h1>
            
            <RotatingSubtitle />
          </div>

          {/* CTA Buttons */}
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1 }}
          >
            <Button 
              variant="hero" 
              size="xl" 
              className="group relative overflow-hidden"
              onClick={() => window.location.href = '/auth'}
            >
              <span className="relative z-10 flex items-center gap-2">
                Start Creating
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
              {/* Button shine effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
              />
            </Button>
            
            <Button 
              variant="outline" 
              size="xl"
              className="group backdrop-blur-sm"
              onClick={() => window.location.href = '/discover'}
            >
              <Sparkles className="w-5 h-5 mr-2 text-secondary group-hover:rotate-12 transition-transform" />
              Discover Creatives
            </Button>
          </motion.div>


          {/* Trust indicators */}
          <motion.div
            className="pt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent" />
              Free to join
            </span>
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              Verified creatives
            </span>
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-secondary" />
              Global network
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none" />
      
      {/* Scroll indicator */}
      <motion.div 
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 8, 0] }}
        transition={{ 
          opacity: { delay: 2 },
          y: { duration: 2, repeat: Infinity, ease: "easeInOut" }
        }}
      >
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
          <motion.div 
            className="w-1.5 h-1.5 rounded-full bg-primary"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    </section>
  );
};

