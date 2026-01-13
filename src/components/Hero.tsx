import { lazy, Suspense } from 'react';
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Music, Palette, Camera, Film, Mic, Play } from "lucide-react";
import { MorphingBlobs } from './hero/MorphingBlobs';
import { ParallaxLayer, FloatingIcon } from './hero/ParallaxLayer';

const ParticleField = lazy(() => import('./hero/ParticleField').then(m => ({ default: m.ParticleField })));

export const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      {/* Morphing Blobs Background */}
      <MorphingBlobs />
      
      {/* Particle Field with Stars */}
      <Suspense fallback={null}>
        <ParticleField />
      </Suspense>
      
      {/* Parallax Floating Icons Layer */}
      <ParallaxLayer speed={0.1} className="absolute inset-0 pointer-events-none">
        <FloatingIcon 
          icon={<Music className="w-10 h-10 text-primary/25" />}
          className="top-[15%] left-[10%]"
          animationDuration="4s"
        />
        <FloatingIcon 
          icon={<Palette className="w-14 h-14 text-secondary/20" />}
          className="top-[20%] right-[15%]"
          animationDuration="5s"
          animationDelay="0.5s"
        />
      </ParallaxLayer>
      
      <ParallaxLayer speed={0.2} className="absolute inset-0 pointer-events-none">
        <FloatingIcon 
          icon={<Camera className="w-12 h-12 text-accent/20" />}
          className="bottom-[25%] left-[20%]"
          animationDuration="4.5s"
          animationDelay="1s"
        />
        <FloatingIcon 
          icon={<Film className="w-10 h-10 text-primary/20" />}
          className="bottom-[30%] right-[10%]"
          animationDuration="5.5s"
          animationDelay="1.5s"
        />
      </ParallaxLayer>
      
      <ParallaxLayer speed={0.3} className="absolute inset-0 pointer-events-none">
        <FloatingIcon 
          icon={<Mic className="w-8 h-8 text-secondary/15" />}
          className="top-[40%] left-[5%]"
          animationDuration="6s"
          animationDelay="2s"
        />
        <FloatingIcon 
          icon={<Play className="w-9 h-9 text-accent/15" />}
          className="top-[35%] right-[8%]"
          animationDuration="4s"
          animationDelay="2.5s"
        />
      </ParallaxLayer>

      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: '80px 80px'
        }}
      />
      
      {/* Radial vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background))_70%)] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <Sparkles className="w-8 h-8 text-secondary animate-pulse" />
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Artistry
            </h1>
            <Sparkles className="w-8 h-8 text-accent animate-pulse" />
          </div>

          {/* Tagline */}
          <div className="space-y-4">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground">
              Create • Connect • Collaborate
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              The ultimate platform connecting musicians, producers, dancers, actors, and creative professionals across Africa
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
            <Button variant="hero" size="xl" className="group" onClick={() => window.location.href = '/auth'}>
              Join the Creative Revolution
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="outline" size="xl" onClick={() => window.location.href = '/auth'}>
              Explore Creators
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 pt-12 max-w-2xl mx-auto">
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
                10K+
              </div>
              <div className="text-sm text-muted-foreground">Creators</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                5K+
              </div>
              <div className="text-sm text-muted-foreground">Projects</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                50+
              </div>
              <div className="text-sm text-muted-foreground">Countries</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
};
