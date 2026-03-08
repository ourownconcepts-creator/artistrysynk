import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Quote, Star, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Testimonial {
  id: number;
  name: string;
  role: string;
  avatar: string;
  location: string;
  quote: string;
  collaboration: string;
  rating: number;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Oluwaseun Adeyemi",
    role: "Music Producer",
    avatar: "",
    location: "Lagos, Nigeria",
    quote: "ArtistrySynk connected me with an incredible vocalist. We created a track that hit 1M streams in just 3 months. This platform changed my career.",
    collaboration: "Beat + Vocals",
    rating: 5
  },
  {
    id: 2,
    name: "Amara Okonkwo",
    role: "Singer & Songwriter",
    avatar: "",
    location: "Abuja, Nigeria",
    quote: "Found my dream production team here. The matching algorithm understood exactly what I was looking for. Now we're working on my debut album!",
    collaboration: "Full Album Production",
    rating: 5
  },
  {
    id: 3,
    name: "Kwame Mensah",
    role: "Filmmaker",
    avatar: "",
    location: "Accra, Ghana",
    quote: "Needed dancers and choreographers for a music video shoot. Within days, I had an amazing team assembled. The video went viral!",
    collaboration: "Music Video",
    rating: 5
  },
  {
    id: 4,
    name: "Fatima Hassan",
    role: "Professional Dancer",
    avatar: "",
    location: "Nairobi, Kenya",
    quote: "As a dancer, finding quality work was always challenging. ArtistrySynk opened doors I never knew existed. I'm now booked months in advance.",
    collaboration: "Live Performances",
    rating: 5
  },
  {
    id: 5,
    name: "Chidi Nwosu",
    role: "Hip-Hop Artist",
    avatar: "",
    location: "Port Harcourt, Nigeria",
    quote: "The vibe on this platform is unmatched. Real creatives, real connections. Dropped 3 collabs this year alone, all from ArtistrySynk links.",
    collaboration: "Multiple Singles",
    rating: 5
  }
];

export const Testimonials = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [realStats, setRealStats] = useState({ matches: 0, collabs: 0, posts: 0 });

  useEffect(() => {
    const loadStats = async () => {
      const [{ count: matchCount }, { count: collabCount }, { count: postCount }] = await Promise.all([
        supabase.from("matches").select("*", { count: "exact", head: true }),
        supabase.from("collaboration_requests").select("*", { count: "exact", head: true }).eq("status", "accepted"),
        supabase.from("collaboration_posts").select("*", { count: "exact", head: true }),
      ]);
      setRealStats({ matches: matchCount || 0, collabs: collabCount || 0, posts: postCount || 0 });
    };
    loadStats();
  }, []);

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9,
    }),
  };

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setCurrentIndex((prevIndex) => {
      let newIndex = prevIndex + newDirection;
      if (newIndex < 0) newIndex = testimonials.length - 1;
      if (newIndex >= testimonials.length) newIndex = 0;
      return newIndex;
    });
  };

  // Auto-advance testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      paginate(1);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const currentTestimonial = testimonials[currentIndex];

  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/50 via-background to-muted/50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,hsl(var(--secondary)/0.1),transparent_50%)]" />

      {/* Floating Quote Marks */}
      <motion.div
        className="absolute top-20 left-[10%] text-primary/10"
        animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <Quote className="w-32 h-32" />
      </motion.div>
      <motion.div
        className="absolute bottom-20 right-[10%] text-secondary/10"
        animate={{ y: [0, 20, 0], rotate: [0, -5, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      >
        <Quote className="w-24 h-24 rotate-180" />
      </motion.div>

      <div className="container mx-auto max-w-5xl relative z-10">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="p-2 rounded-full bg-gradient-to-r from-secondary to-accent">
              <Sparkles className="w-5 h-5 text-secondary-foreground" />
            </div>
            <Badge variant="secondary" className="px-4 py-1">
              Success Stories
            </Badge>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            <span className="text-foreground">Creatives </span>
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Love ArtistrySynk
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Real stories from real collaborations. See how our community is creating magic together.
          </p>
        </motion.div>

        {/* Testimonial Card */}
        <div className="relative h-[400px] md:h-[320px] flex items-center justify-center">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={1}
              onDragEnd={(e, { offset, velocity }) => {
                const swipe = swipePower(offset.x, velocity.x);
                if (swipe < -swipeConfidenceThreshold) {
                  paginate(1);
                } else if (swipe > swipeConfidenceThreshold) {
                  paginate(-1);
                }
              }}
              className="absolute w-full max-w-3xl cursor-grab active:cursor-grabbing"
            >
              <Card className="border-0 bg-card/80 backdrop-blur-xl shadow-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
                <CardContent className="p-8 md:p-12 relative">
                  {/* Quote Icon */}
                  <div className="absolute top-6 right-6 p-3 rounded-full bg-primary/10">
                    <Quote className="w-6 h-6 text-primary" />
                  </div>

                  {/* Rating */}
                  <div className="flex gap-1 mb-6">
                    {[...Array(currentTestimonial.rating)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <Star className="w-5 h-5 fill-secondary text-secondary" />
                      </motion.div>
                    ))}
                  </div>

                  {/* Quote */}
                  <motion.p
                    className="text-lg md:text-xl text-foreground leading-relaxed mb-8 font-medium"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    "{currentTestimonial.quote}"
                  </motion.p>

                  {/* Author Info */}
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-14 h-14 border-2 border-primary/20">
                        <AvatarImage src={currentTestimonial.avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground text-lg font-bold">
                          {currentTestimonial.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-foreground">
                          {currentTestimonial.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {currentTestimonial.role} • {currentTestimonial.location}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-secondary/50 text-secondary">
                      {currentTestimonial.collaboration}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Arrows */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 md:-left-16 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-card/80 backdrop-blur-sm border border-border/50 hover:bg-primary hover:text-primary-foreground transition-all z-10"
            onClick={() => paginate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 md:-right-16 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-card/80 backdrop-blur-sm border border-border/50 hover:bg-primary hover:text-primary-foreground transition-all z-10"
            onClick={() => paginate(1)}
          >
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Dots Indicator */}
        <div className="flex justify-center gap-2 mt-8">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setDirection(index > currentIndex ? 1 : -1);
                setCurrentIndex(index);
              }}
              className={`transition-all duration-300 rounded-full ${
                index === currentIndex
                  ? 'w-8 h-2 bg-gradient-to-r from-primary to-secondary'
                  : 'w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
            />
          ))}
        </div>

        {/* Stats Row */}
        <motion.div
          className="grid grid-cols-3 gap-8 mt-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="space-y-2">
            <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {realStats.matches}
            </div>
            <p className="text-sm text-muted-foreground">Matches Made</p>
          </div>
          <div className="space-y-2">
            <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
              {realStats.collabs}
            </div>
            <p className="text-sm text-muted-foreground">Collaborations</p>
          </div>
          <div className="space-y-2">
            <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
              {realStats.posts}
            </div>
            <p className="text-sm text-muted-foreground">Community Posts</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
