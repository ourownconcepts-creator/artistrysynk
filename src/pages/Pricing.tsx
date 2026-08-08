import { useState, useEffect } from "react";
import { Check, Loader2, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "@/lib/router-compat";
import { PageSEO, FAQSchema } from "@/components/seo";
import logoImg from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useServerFn } from "@tanstack/react-start";
import { initializePaystackTransaction } from "@/lib/paystack-initialize.functions";

const Pricing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { subscription, loading: subLoading } = useSubscription();
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const initializePaystackTransactionFn = useServerFn(initializePaystackTransaction);

  useEffect(() => {
    // Check for success callback
    if (searchParams.get("success") === "true") {
      toast.success("Payment successful!", {
        description: "Your subscription has been activated.",
      });
    }

    // Get user
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser({ id: user.id, email: user.email! });
      }
    });
  }, [searchParams]);

  const handleSubscribe = async (plan: "pro" | "studio") => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setProcessingPlan(plan);

    try {
      const data = await initializePaystackTransactionFn({
        data: {
          email: user.email,
          plan,
          userId: user.id,
        },
      });

      if (data?.data?.authorization_url) {
        window.location.href = data.data.authorization_url;
      } else {
        throw new Error("Failed to get payment URL");
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Failed to initialize payment. Please try again.");
    } finally {
      setProcessingPlan(null);
    }
  };

  const faqs = [
    {
      question: "Can I cancel my ArtistrySynk subscription anytime?",
      answer: "Yes! You can cancel your subscription at any time. No questions asked."
    },
    {
      question: "Is the ArtistrySynk free plan really free forever?",
      answer: "Absolutely! You can use ArtistrySynk completely free with unlimited matches and messaging."
    },
    {
      question: "What payment methods does ArtistrySynk accept?",
      answer: "We accept all major Nigerian payment methods including cards, bank transfers, and mobile money via Paystack."
    }
  ];

  const plans = [
    {
      id: "free" as const,
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
      id: "pro" as const,
      name: "Pro",
      price: "₦4,500",
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
      cta: "Upgrade to Pro",
      popular: true
    },
    {
      id: "studio" as const,
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
      cta: "Upgrade to Studio",
      popular: false
    }
  ];

  const getButtonAction = (plan: typeof plans[0]) => {
    if (plan.id === "free") {
      return () => navigate("/auth");
    }
    return () => handleSubscribe(plan.id as "pro" | "studio");
  };

  const getButtonText = (plan: typeof plans[0]) => {
    if (processingPlan === plan.id) {
      return (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Processing...
        </>
      );
    }
    if (subscription?.tier === plan.id) {
      return (
        <>
          <CheckCircle className="w-4 h-4 mr-2" />
          Current Plan
        </>
      );
    }
    return plan.cta;
  };

  const isCurrentPlan = (planId: string) => subscription?.tier === planId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      <PageSEO
        title="Pricing - Simple & Transparent | ArtistrySynk"
        description="Start free and upgrade when you're ready. Connect with creatives, unlimited matches and messaging. Pro plans for verified badges and advanced features."
        canonicalUrl="https://artistrysynk.app/pricing"
        keywords="ArtistrySynk pricing, creative collaboration cost, artist network pricing, free creative platform"
        breadcrumbs={[
          { name: "Home", url: "https://artistrysynk.app" },
          { name: "Pricing", url: "https://artistrysynk.app/pricing" }
        ]}
      />
      <FAQSchema faqs={faqs} />
      
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <img src={logoImg} alt="ArtistrySynk" className="h-80 w-auto mx-auto mb-6" />
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Start free and upgrade when you're ready to unlock advanced features
          </p>
          {subscription && !subLoading && (
            <Badge variant="secondary" className="text-lg py-2 px-4">
              Current Plan: {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)}
            </Badge>
          )}
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="sr-only">Subscription plans</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative ${plan.popular ? 'border-primary shadow-2xl scale-105' : 'border-border/50'} ${isCurrentPlan(plan.id) ? 'ring-2 ring-primary' : ''} transition-all duration-300 hover:shadow-xl`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-secondary text-white px-6 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </div>
                )}
                {isCurrentPlan(plan.id) && (
                  <div className="absolute -top-4 right-4 bg-green-500 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Active
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
                    onClick={getButtonAction(plan)}
                    disabled={processingPlan !== null || isCurrentPlan(plan.id)}
                  >
                    {getButtonText(plan)}
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
                <p className="text-muted-foreground">Absolutely! You can use ArtistrySynk completely free with unlimited matches and messaging.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-bold text-lg mb-2">What payment methods do you accept?</h3>
                <p className="text-muted-foreground">We accept all major Nigerian payment methods including cards, bank transfers, and mobile money via Paystack.</p>
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
