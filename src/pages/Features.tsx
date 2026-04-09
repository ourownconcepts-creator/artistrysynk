import { Music, Users, MessageCircle, Sparkles, Shield, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { PageSEO } from "@/components/seo";
import logoImg from "@/assets/logo.png";

const FeaturesPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Users,
      title: "Smart Matching",
      description: "Our AI-powered algorithm connects you with creatives who complement your skills and vision.",
      color: "from-primary to-primary/80"
    },
    {
      icon: MessageCircle,
      title: "Real-Time Collaboration",
      description: "Chat instantly with matches, share ideas, and start creating together without delay.",
      color: "from-secondary to-secondary/80"
    },
    {
      icon: Sparkles,
      title: "Portfolio Showcase",
      description: "Display your best work and let your creativity speak. Upload audio, images, and project descriptions.",
      color: "from-accent to-accent/80"
    },
    {
      icon: Shield,
      title: "Verified Profiles",
      description: "Connect with confidence. Our verification system ensures authentic creative professionals.",
      color: "from-primary to-secondary"
    },
    {
      icon: Zap,
      title: "Quick Discovery",
      description: "Swipe through talented creatives in your area and around the world. Find your next collaborator in seconds.",
      color: "from-secondary to-accent"
    },
    {
      icon: Music,
      title: "Multi-Discipline Support",
      description: "Whether you're a producer, artist, designer, or filmmaker, find your creative match.",
      color: "from-accent to-primary"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      <PageSEO
        title="Features - Smart Matching & Collaboration Tools | ArtistrySynk"
        description="Discover powerful features for creatives: AI-powered matching, real-time collaboration, portfolio showcase, verified profiles, and quick discovery tools."
        canonicalUrl="https://artistrysynk.com/features"
        keywords="creative matching, artist collaboration tools, portfolio showcase, verified creatives, global artist features, music collaboration"
        breadcrumbs={[
          { name: "Home", url: "https://artistrysynk.com" },
          { name: "Features", url: "https://artistrysynk.com/features" }
        ]}
      />
      
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <img src={logoImg} alt="ArtistrySynk" className="h-80 w-auto mx-auto mb-6" />
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Powerful Features for Global Creatives
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Everything you need to discover, connect, and collaborate with talented creatives worldwide
          </p>
          <Button variant="hero" size="lg" onClick={() => navigate("/auth")}>
            Get Started Free
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-border/50">
                <CardContent className="pt-6">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <Card className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 border-primary/20">
            <CardContent className="pt-12 pb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Start Creating?
              </h2>
              <p className="text-muted-foreground mb-8 text-lg">
                Join thousands of creatives already collaborating on ArtistrySynk
              </p>
              <Button variant="hero" size="lg" onClick={() => navigate("/auth")}>
                Join Now - It's Free
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default FeaturesPage;
