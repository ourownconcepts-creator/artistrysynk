import { Quote, Music, Mic, Camera, Palette } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@/lib/router-compat";
import { PageSEO } from "@/components/seo";
import logoImg from "@/assets/logo.png";

const SuccessStories = () => {
  const navigate = useNavigate();

  const stories = [
    {
      icon: Music,
      names: "Tunde & Amara",
      roles: "Producer & Artist",
      location: "Lagos, Nigeria",
      story: "We matched on ArtistrySynk in March 2024. Within weeks, we created three tracks together. Our collaboration led to a record deal and our single 'African Dreams' hit 1M streams!",
      achievement: "1M+ Streams",
      color: "from-primary to-primary/80"
    },
    {
      icon: Camera,
      names: "Kwame & Zainab",
      roles: "Filmmaker & Cinematographer",
      location: "Accra, Ghana",
      story: "Found each other through ArtistrySynk while looking for a creative partner. We've since shot 5 music videos for top African artists and launched our own production company.",
      achievement: "5 Music Videos",
      color: "from-secondary to-secondary/80"
    },
    {
      icon: Palette,
      names: "Chioma & David",
      roles: "Designer & Photographer",
      location: "Nairobi, Kenya",
      story: "Matched during the pandemic. Started with one brand shoot and now we're the go-to creative team for major brands across East Africa. ArtistrySynk changed our lives!",
      achievement: "20+ Brand Clients",
      color: "from-accent to-accent/80"
    },
    {
      icon: Mic,
      names: "Femi & Sarah",
      roles: "Rapper & Audio Engineer",
      location: "Abuja, Nigeria",
      story: "I was struggling to find the right sound engineer. Found Sarah on ArtistrySynk and she understood my vision perfectly. We've released an EP that's doing amazing numbers!",
      achievement: "EP Released",
      color: "from-primary to-secondary"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      <PageSEO
        title="Success Stories - Creative Collaborations That Inspire"
        description="Read how musicians, producers, dancers, and creatives found their perfect match on ArtistrySynk and created amazing projects together."
        canonicalUrl="https://artistrysynk.app/success-stories"
        keywords="creative success stories, artist collaboration stories, music collaboration, ArtistrySynk testimonials"
        breadcrumbs={[
          { name: "Home", url: "https://artistrysynk.app" },
          { name: "Success Stories", url: "https://artistrysynk.app/success-stories" }
        ]}
      />
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <img src={logoImg} alt="ArtistrySynk" className="h-80 w-auto mx-auto mb-6" />
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Success Stories
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Real collaborations. Real success. See how African creatives are building their dreams together.
          </p>
        </div>
      </section>

      {/* Stories Grid */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8">
            {stories.map((story, index) => (
              <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${story.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                      <story.icon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold mb-1">{story.names}</h3>
                      <p className="text-primary font-semibold">{story.roles}</p>
                      <p className="text-sm text-muted-foreground">{story.location}</p>
                    </div>
                  </div>
                  
                  <div className="relative mb-4">
                    <Quote className="absolute -top-2 -left-2 w-8 h-8 text-primary/20" />
                    <p className="text-muted-foreground italic pl-6">"{story.story}"</p>
                  </div>
                  
                  <div className="inline-block bg-gradient-to-r from-primary/10 to-secondary/10 px-4 py-2 rounded-full">
                    <span className="text-sm font-semibold text-primary">🎉 {story.achievement}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 bg-card/50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">
            The Numbers Speak
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
                10K+
              </div>
              <p className="text-muted-foreground">Active Creatives</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent mb-2">
                50K+
              </div>
              <p className="text-muted-foreground">Matches Made</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent mb-2">
                1000+
              </div>
              <p className="text-muted-foreground">Projects Completed</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-2">
                15+
              </div>
              <p className="text-muted-foreground">African Countries</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Write Your Success Story
          </h2>
          <p className="text-muted-foreground mb-8 text-lg">
            Join thousands of African creatives finding their perfect collaborators
          </p>
          <Button variant="hero" size="lg" onClick={() => navigate("/auth")}>
            Start Your Journey Today
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default SuccessStories;
