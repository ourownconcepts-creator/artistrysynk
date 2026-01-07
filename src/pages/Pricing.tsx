import { Check } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { PageSEO, FAQSchema } from "@/components/seo";

const Pricing = () => {
  const navigate = useNavigate();

  const faqs = [
    {
      question: "Can I cancel my Artistry.ng subscription anytime?",
      answer: "Yes! You can cancel your subscription at any time. No questions asked."
    },
    {
      question: "Is the Artistry.ng free plan really free forever?",
      answer: "Absolutely! You can use Artistry.ng completely free with unlimited matches and messaging."
    },
    {
      question: "What payment methods does Artistry.ng accept?",
      answer: "We accept all major Nigerian payment methods including cards, bank transfers, and mobile money."
    }
  ];
  const plans = [
    {
      name: "Free",
      price: "₦0",
      period: "forever",
      description: "Perfect for getting started",
      features: [
        "Create your profile",
        "Unlimited swipes",
        "Match with creatives",
        "Direct messaging",
        "Basic portfolio showcase",
        "Search by location"
      ],
      cta: "Get Started Free",
      popular: false
    },
    {
      name: "Pro",
      price: "₦2,500",
      period: "per month",
      description: "For serious collaborators",
      features: [
        "Everything in Free",
        "Advanced matching algorithm",
        "See who liked you",
        "Unlimited rewinds",
        "Priority profile visibility",
        "Verified badge",
        "Portfolio analytics",
        "No ads"
      ],
      cta: "Coming Soon",
      popular: true
    },
    {
      name: "Studio",
      price: "₦15,000",
      period: "per month",
      description: "For creative studios & teams",
      features: [
        "Everything in Pro",
        "Team accounts (up to 5)",
        "Studio verification",
        "Advanced analytics",
        "Direct project posting",
        "Featured listings",
        "Priority support",
        "API access"
      ],
      cta: "Coming Soon",
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      <PageSEO
        title="Pricing - Simple & Transparent | Artistry.ng"
        description="Start free and upgrade when you're ready. Connect with African creatives, unlimited matches and messaging. Pro plans for verified badges and advanced features."
        canonicalUrl="https://artistry.ng/pricing"
        keywords="Artistry.ng pricing, creative collaboration cost, African artist network pricing, free creative platform"
        breadcrumbs={[
          { name: "Home", url: "https://artistry.ng" },
          { name: "Pricing", url: "https://artistry.ng/pricing" }
        ]}
      />
      <FAQSchema faqs={faqs} />
      
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Start free and upgrade when you're ready to unlock advanced features
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative ${plan.popular ? 'border-primary shadow-2xl scale-105' : 'border-border/50'} transition-all duration-300 hover:shadow-xl`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-secondary text-white px-6 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </div>
                )}
                <CardHeader className="text-center pt-8">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-muted-foreground mb-4">{plan.description}</p>
                  <div className="mb-4">
                    <span className="text-5xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground ml-2">/ {plan.period}</span>
                  </div>
                  <Button 
                    variant={plan.popular ? "hero" : "outline"} 
                    className="w-full"
                    onClick={() => plan.cta === "Get Started Free" && navigate("/auth")}
                    disabled={plan.cta === "Coming Soon"}
                  >
                    {plan.cta}
                  </Button>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-card/50">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-bold text-lg mb-2">Can I cancel anytime?</h3>
                <p className="text-muted-foreground">Yes! You can cancel your subscription at any time. No questions asked.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-bold text-lg mb-2">Is the free plan really free forever?</h3>
                <p className="text-muted-foreground">Absolutely! You can use Artistry.ng completely free with unlimited matches and messaging.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-bold text-lg mb-2">What payment methods do you accept?</h3>
                <p className="text-muted-foreground">We accept all major Nigerian payment methods including cards, bank transfers, and mobile money.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Pricing;
