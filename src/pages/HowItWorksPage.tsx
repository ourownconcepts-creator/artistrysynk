import { UserPlus, Users, MessageCircle, Rocket } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { PageSEO } from "@/components/seo";

const HowItWorksPage = () => {
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      <PageSEO
        title="How It Works - Find Your Creative Match | Artistry.ng"
        description="Four simple steps to finding your perfect creative collaborator: Create profile, discover creatives, match & connect, and create together."
        canonicalUrl="https://artistry.ng/how-it-works"
        keywords="how to find collaborators, creative matching process, artist networking, music collaboration steps, find producers"
        breadcrumbs={[
          { name: "Home", url: "https://artistry.ng" },
          { name: "How It Works", url: "https://artistry.ng/how-it-works" }
        ]}
      />
      
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            How Artistry.ng Works
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
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="aspect-video bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 flex items-center justify-center">
                <div className="text-center">
                  <Rocket className="w-20 h-20 mx-auto mb-4 text-primary" />
                  <p className="text-xl font-semibold">Demo video coming soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-muted-foreground mb-8 text-lg">
            Join Artistry.ng today and start your creative journey
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
