import { useState, useRef, useEffect } from "react";
import { UserPlus, Users, MessageCircle, Rocket, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { PageSEO } from "@/components/seo";
import logoImg from "@/assets/logo.png";
import artistryTutorialVideo from "@/assets/artistry-tutorial.mp4";

const HowItWorksPage = () => {
  const navigate = useNavigate();
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);

  // Intersection Observer for scroll-triggered autoplay
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAutoPlayed && videoRef.current) {
            videoRef.current.play();
            setIsPlaying(true);
            setHasAutoPlayed(true);
          }
        });
      },
      { threshold: 0.5 }
    );

    if (videoContainerRef.current) {
      observer.observe(videoContainerRef.current);
    }

    return () => observer.disconnect();
  }, [hasAutoPlayed]);

  const steps = [
    {
      icon: UserPlus,
      step: "01",
      title: "Create Your Profile",
      description: "Sign up in seconds and tell us about your creative skills, preferred genres, and what you're looking for in a collaborator."
    },
    {
      icon: Users,
      step: "02",
      title: "Discover Creatives",
      description: "Swipe through profiles of talented artists, producers, designers, and filmmakers. Like those you want to work with."
    },
    {
      icon: MessageCircle,
      step: "03",
      title: "Match & Connect",
      description: "When there's a mutual interest, you'll match! Start chatting immediately and discuss potential projects."
    },
    {
      icon: Rocket,
      step: "04",
      title: "Create Together",
      description: "Collaborate on amazing projects, build your network, and take your creative career to the next level."
    }
  ];

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      <PageSEO
        title="How It Works - Find Your Creative Match | Artistry"
        description="Four simple steps to finding your perfect creative collaborator: Create profile, discover creatives, match & connect, and create together."
        canonicalUrl="https://artistrysynk.com/how-it-works"
        keywords="how to find collaborators, creative matching process, artist networking, music collaboration steps, find producers"
        breadcrumbs={[
          { name: "Home", url: "https://artistrysynk.com" },
          { name: "How It Works", url: "https://artistrysynk.com/how-it-works" }
        ]}
      />
      
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <img src={logoImg} alt="ArtistrySynk" className="h-40 w-auto mx-auto mb-6" />
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            How ArtistrySynk Works
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Four simple steps to finding your perfect creative collaborator
          </p>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 relative">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <Card className="group hover:shadow-xl transition-all duration-300 h-full">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-6">
                      <div className="flex-shrink-0">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center group-hover:scale-110 transition-transform">
                          <step.icon className="w-10 h-10 text-white" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="text-6xl font-bold text-primary/10 mb-2">{step.step}</div>
                        <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                        <p className="text-muted-foreground text-lg">{step.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-6 w-12 h-1 bg-gradient-to-r from-primary to-secondary" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Video/Demo Section */}
      <section className="py-20 px-4 bg-card/50">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            See It In Action
          </h2>
          <p className="text-muted-foreground mb-8 text-lg">
            Watch how creatives are finding their perfect collaborators
          </p>
          <div ref={videoContainerRef}>
            <Card className="overflow-hidden shadow-2xl border-2 border-primary/20 relative group">
              <CardContent className="p-0">
                <div className="relative aspect-video bg-gradient-to-br from-background via-primary/5 to-secondary/5">
                  {/* Custom Artistry Tutorial Video */}
                  <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-cover"
                    src={artistryTutorialVideo}
                    muted={isMuted}
                    loop
                    playsInline
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                  
                  {/* Video Controls Overlay */}
                  <div className="absolute bottom-4 right-4 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={toggleMute}
                      className="p-3 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-lg"
                      aria-label={isMuted ? "Unmute video" : "Mute video"}
                    >
                      {isMuted ? (
                        <VolumeX className="w-5 h-5 text-foreground" />
                      ) : (
                        <Volume2 className="w-5 h-5 text-foreground" />
                      )}
                    </button>
                    <button
                      onClick={togglePlayPause}
                      className="p-3 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-lg"
                      aria-label={isPlaying ? "Pause video" : "Play video"}
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5 text-foreground" />
                      ) : (
                        <Play className="w-5 h-5 text-foreground" />
                      )}
                    </button>
                  </div>
                  
                  {/* Play button overlay when paused */}
                  {!isPlaying && (
                    <button
                      onClick={togglePlayPause}
                      className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity"
                      aria-label="Play video"
                    >
                      <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center shadow-2xl">
                        <Play className="w-10 h-10 text-primary-foreground ml-1" />
                      </div>
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Video Features Highlights */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="p-6 rounded-xl bg-card border border-border">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Quick Setup</h3>
              <p className="text-sm text-muted-foreground">Create your profile in under 2 minutes</p>
            </div>
            <div className="p-6 rounded-xl bg-card border border-border">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Smart Matching</h3>
              <p className="text-sm text-muted-foreground">AI-powered creative synergy scoring</p>
            </div>
            <div className="p-6 rounded-xl bg-card border border-border">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-secondary flex items-center justify-center mx-auto mb-4">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Collaborate</h3>
              <p className="text-sm text-muted-foreground">Built-in project rooms & file sharing</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-muted-foreground mb-8 text-lg">
            Join ArtistrySynk today and start your creative journey
          </p>
          <Button variant="hero" size="lg" onClick={() => navigate("/auth")}>
            Create Your Free Account
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HowItWorksPage;
