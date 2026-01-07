import { Card, CardContent } from "@/components/ui/card";
import iconMusic from "@/assets/icon-music.png";
import iconMatch from "@/assets/icon-match.png";
import iconCollab from "@/assets/icon-collab.png";
import { Music, Users, FolderOpen, MessageCircle, Sparkles, Zap } from "lucide-react";

const features = [
  {
    icon: iconMatch,
    title: "Smart Matching",
    description: "Swipe to connect with creatives that match your vision. Find your perfect collaborator in seconds.",
    gradient: "from-secondary to-accent",
  },
  {
    icon: iconMusic,
    title: "Portfolio Showcase",
    description: "Upload audio, video, and images. Build a stunning portfolio that showcases your creative genius.",
    gradient: "from-primary to-secondary",
  },
  {
    icon: iconCollab,
    title: "Project Collaboration",
    description: "Create shared workspaces with your matches. Manage projects, share files, and bring ideas to life together.",
    gradient: "from-accent to-primary",
  },
];

const additionalFeatures = [
  {
    icon: MessageCircle,
    title: "Real-time Chat",
    description: "Instant messaging with all your creative connections",
  },
  {
    icon: Users,
    title: "Role-based Discovery",
    description: "Find exactly who you need: artists, producers, dancers, actors, and more",
  },
  {
    icon: Sparkles,
    title: "Verified Profiles",
    description: "Trust badges for professional creators and established artists",
  },
];

export const Features = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            Everything You Need to{" "}
            <span className="bg-gradient-to-r from-secondary via-accent to-primary bg-clip-text text-transparent">
              Create Together
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            All the tools and features to discover, connect, and collaborate with creative professionals
          </p>
        </div>

        {/* Main Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-[0_0_30px_hsl(270,70%,55%/0.2)] group"
            >
              <CardContent className="p-8 space-y-4">
                <div className="relative w-20 h-20 mx-auto">
                  <img 
                    src={feature.icon} 
                    alt={feature.title}
                    className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <h3 className={`text-2xl font-bold bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent`}>
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {additionalFeatures.map((feature, index) => (
            <div 
              key={index}
              className="flex items-start gap-4 p-6 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors"
            >
              <div className="p-3 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
