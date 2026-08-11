import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { Roles } from "@/components/Roles";
import { HowItWorks } from "@/components/HowItWorks";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";
import { PortfolioShowcase } from "@/components/home/PortfolioShowcase";
import { Testimonials } from "@/components/home/Testimonials";
import { PartnersCarousel } from "@/components/home/PartnersCarousel";
import { NewsletterSignup } from "@/components/home/NewsletterSignup";
import { StatsCounter } from "@/components/home/StatsCounter";
import { RecentSignups } from "@/components/home/RecentSignups";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Hero />
      <PartnersCarousel />
      <StatsCounter />
      <RecentSignups />
      <PortfolioShowcase />
      <Features />
      <Roles />
      <Testimonials />
      <HowItWorks />
      <NewsletterSignup />
      <CTA />
      <Footer />
    </div>
  );
};

export default Index;
