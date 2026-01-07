import { Heart, Target, Users, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { PageSEO } from "@/components/seo";

const About = () => {
  const navigate = useNavigate();

  const values = [
    {
      icon: Heart,
      title: "Passion for Creativity",
      description: "We believe African creativity is unmatched and deserves a platform to flourish."
    },
    {
      icon: Users,
      title: "Community First",
      description: "Building genuine connections between creatives is at the heart of everything we do."
    },
    {
      icon: Target,
      title: "Excellence",
      description: "We're committed to providing the best experience for discovering and collaborating."
    },
    {
      icon: Globe,
      title: "Pan-African Vision",
      description: "Connecting creatives across all African nations to build a unified creative ecosystem."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      <PageSEO
        title="About Us - Our Story & Mission | Artistry.ng"
        description="Building the home of African creativity, one connection at a time. Learn about our mission to empower African creatives and connect talented professionals."
        canonicalUrl="https://artistry.ng/about"
        keywords="about Artistry.ng, African creative platform, creative networking Africa, Nigerian artist platform, creative community"
        breadcrumbs={[
          { name: "Home", url: "https://artistry.ng" },
          { name: "About", url: "https://artistry.ng/about" }
        ]}
      />
      
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            About Artistry.ng
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            We're building the home of African creativity, one connection at a time.
          </p>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="border-border/50">
            <CardContent className="pt-8">
              <h2 className="text-3xl font-bold mb-6">Our Story</h2>
              <div className="space-y-4 text-muted-foreground text-lg leading-relaxed">
                <p>
                  Artistry.ng was born from a simple observation: Africa is bursting with incredible creative talent, but finding the right collaborators has always been a challenge.
                </p>
                <p>
                  In 2024, we set out to change that. We built a platform where producers can find artists, filmmakers can discover cinematographers, and designers can connect with photographers—all through an intuitive, mobile-first experience.
                </p>
                <p>
                  Today, we're proud to be the leading creative networking platform across Africa, helping thousands of creatives turn their ideas into reality through meaningful collaborations.
                </p>
                <p className="font-semibold text-foreground">
                  Our mission is simple: empower African creatives to find their perfect collaborators and create world-class work together.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 px-4 bg-card/50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">
            Our Core Values
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <Card key={index} className="text-center group hover:shadow-xl transition-all duration-300 border-border/50">
                <CardContent className="pt-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <value.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{value.title}</h3>
                  <p className="text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Meet the Team
          </h2>
          <p className="text-muted-foreground mb-12 text-lg max-w-2xl mx-auto">
            We're a diverse team of creatives, developers, and dreamers passionate about empowering African talent.
          </p>
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-8">
              <p className="text-muted-foreground text-lg">
                Our team is currently expanding. If you're passionate about connecting African creatives and want to join our mission, check out our <button onClick={() => navigate("/careers")} className="text-primary hover:underline font-semibold">careers page</button>.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Join Our Community
          </h2>
          <p className="text-muted-foreground mb-8 text-lg">
            Be part of the movement that's transforming African creative collaboration
          </p>
          <Button variant="hero" size="lg" onClick={() => navigate("/auth")}>
            Get Started Today
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
