import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { Roles } from "@/components/Roles";
import { HowItWorks } from "@/components/HowItWorks";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";
import { OrganizationSchema, WebsiteSchema, PageSEO } from "@/components/seo";

const Index = () => {
  return (
    <div className="min-h-screen">
      <PageSEO
        title="ArtistrySynk - Create • Connect • Collaborate | Africa's Creative Network"
        description="The ultimate platform connecting musicians, producers, dancers, actors, and creative professionals across Africa. Create, connect, and collaborate with talented creatives."
        canonicalUrl="https://artistrysynk.com/"
        keywords="creative collaboration, African artists, musicians, producers, dancers, actors, Afrobeats, Nigerian music, creative professionals, talent network"
      />
      <OrganizationSchema />
      <WebsiteSchema />
      <Hero />
      <Features />
      <Roles />
      <HowItWorks />
      <CTA />
      <Footer />
    </div>
  );
};

export default Index;
