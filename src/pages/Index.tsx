import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { Roles } from "@/components/Roles";
import { HowItWorks } from "@/components/HowItWorks";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";
import { PortfolioShowcase } from "@/components/home/PortfolioShowcase";
import { OrganizationSchema, WebsiteSchema, PageSEO } from "@/components/seo";

const Index = () => {
  return (
    <div className="min-h-screen">
      <PageSEO
        title="ArtistrySynk - Create • Connect • Collaborate | Creative Network"
        description="The ultimate platform connecting musicians, producers, dancers, actors, and creative professionals. Create, connect, and collaborate with talented creatives worldwide."
        canonicalUrl="https://artistrysynk.com/"
        keywords="creative collaboration, artists, musicians, producers, dancers, actors, Afrobeats, music, creative professionals, talent network"
      />
      <OrganizationSchema />
      <WebsiteSchema />
      <Hero />
      <PortfolioShowcase />
      <Features />
      <Roles />
      <HowItWorks />
      <CTA />
      <Footer />
    </div>
  );
};

export default Index;
