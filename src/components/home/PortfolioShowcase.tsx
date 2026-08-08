import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import { 
  Play, 
  Image as ImageIcon, 
  Music, 
  Video, 
  Eye,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface PortfolioItem {
  id: string;
  title: string;
  description: string | null;
  media_type: string;
  media_url: string;
  user_id: string;
  created_at: string;
  profile: {
    id: string;
    full_name: string;
    username: string;
    avatar_url: string | null;
  } | null;
}

const getMediaIcon = (type: string) => {
  switch (type) {
    case 'image': return ImageIcon;
    case 'video': return Video;
    case 'audio': return Music;
    default: return ImageIcon;
  }
};

export const PortfolioShowcase = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    loadPortfolioItems();
  }, []);

  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());
    api.on('select', () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  useEffect(() => {
    if (!api || isPaused || items.length === 0) return;

    const interval = setInterval(() => {
      api.scrollNext();
    }, 4000);

    return () => clearInterval(interval);
  }, [api, isPaused, items.length]);

  const loadPortfolioItems = async () => {
    // Get recent portfolio items with public visibility
    const { data: portfolioData, error } = await supabase
      .from('portfolio_items')
      .select('id, title, description, media_type, media_url, user_id, created_at')
      .order('created_at', { ascending: false })
      .limit(12);

    if (error || !portfolioData || portfolioData.length === 0) {
      setLoading(false);
      return;
    }

    // Get profile data for each item
    const userIds = [...new Set(portfolioData.map(item => item.user_id))];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .in('id', userIds);

    const enrichedItems = portfolioData.map(item => ({
      ...item,
      profile: profilesData?.find(p => p.id === item.user_id) || null
    }));

    setItems(enrichedItems);
    setLoading(false);
  };

  if (loading) {
    return (
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <Skeleton className="h-8 w-64 mx-auto mb-4" />
            <Skeleton className="h-4 w-96 mx-auto" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-background via-muted/30 to-background overflow-hidden">
      <div className="container mx-auto max-w-7xl">
        {/* Section Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="p-2 rounded-full bg-gradient-to-r from-primary to-secondary">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <Badge variant="secondary" className="px-4 py-1">
              Featured Work
            </Badge>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Creator Showcase
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover amazing work from talented creatives in our community
          </p>
        </motion.div>

        {/* Portfolio Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <Carousel
            opts={{
              align: 'start',
              loop: true,
            }}
            setApi={setApi}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {items.map((item, index) => {
                const MediaIcon = getMediaIcon(item.media_type);
                
                return (
                  <CarouselItem key={item.id} className="pl-4 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card 
                        className="group cursor-pointer overflow-hidden border-0 bg-card/50 backdrop-blur-xs shadow-lg hover:shadow-xl transition-all duration-300"
                        onClick={() => navigate(`/profile/${item.user_id}`)}
                      >
                        {/* Media Preview */}
                        <div className="relative aspect-square overflow-hidden">
                          {item.media_type === 'image' ? (
                            <img
                              src={item.media_url}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : item.media_type === 'video' ? (
                            <div className="relative w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20">
                              <video
                                src={item.media_url}
                                className="w-full h-full object-cover"
                                muted
                                playsInline
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="p-4 rounded-full bg-background/80 backdrop-blur-xs group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                                  <Play className="w-8 h-8 text-foreground group-hover:text-primary-foreground" />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 flex items-center justify-center">
                              <div className="text-center space-y-4">
                                <div className="p-6 rounded-full bg-background/80 backdrop-blur-xs mx-auto w-fit">
                                  <Music className="w-12 h-12 text-primary" />
                                </div>
                                <p className="text-sm text-muted-foreground font-medium px-4">
                                  Audio Track
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                          {/* Media Type Badge */}
                          <div className="absolute top-3 right-3 p-2 rounded-full bg-background/80 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity">
                            <MediaIcon className="w-4 h-4 text-foreground" />
                          </div>

                          {/* View Icon */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="p-3 rounded-full bg-primary/90 backdrop-blur-xs shadow-lg">
                              <Eye className="w-5 h-5 text-primary-foreground" />
                            </div>
                          </div>
                        </div>

                        {/* Content */}
                        <CardContent className="p-4 space-y-3">
                          <div>
                            <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                              {item.title}
                            </h3>
                            {item.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                                {item.description}
                              </p>
                            )}
                          </div>

                          {/* Creator Info */}
                          {item.profile && (
                            <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={item.profile.avatar_url || undefined} />
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                  {item.profile.full_name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground truncate flex-1">
                                @{item.profile.username}
                              </span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex -left-6 h-10 w-10 bg-card/90 backdrop-blur-xs border-primary/20 hover:bg-primary hover:text-primary-foreground" />
            <CarouselNext className="hidden md:flex -right-6 h-10 w-10 bg-card/90 backdrop-blur-xs border-primary/20 hover:bg-primary hover:text-primary-foreground" />
          </Carousel>

          {/* Progress Dots */}
          <div className="flex justify-center gap-2 mt-6">
            {items.slice(0, Math.min(8, items.length)).map((_, index) => (
              <button
                key={index}
                onClick={() => api?.scrollTo(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  current === index 
                    ? 'bg-primary w-6' 
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
              />
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Button
            variant="outline"
            size="lg"
            className="group"
            onClick={() => navigate('/discover')}
          >
            Explore All Creatives
            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};
