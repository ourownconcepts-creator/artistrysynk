import { Link } from "@/lib/router-compat";
import { ShieldCheck } from "lucide-react";
import { Footer } from "@/components/Footer";
import { PageSEO } from "@/components/seo";
import { Badge } from "@/components/ui/badge";
import { PrivacyRequestsCard } from "@/components/settings/PrivacyRequestsCard";
import { LEGAL_CONFIG } from "@/config/legal";

/** Public entry point for data-subject requests (access, export, deletion). */
const PrivacyRequests = () => (
  <div className="min-h-screen bg-background">
    <PageSEO
      title="Submit a data request | ArtistrySynk"
      description="Ask ArtistrySynk to access, correct, export, restrict or delete your personal data and track your request with a reference number."
      canonicalUrl="https://artistrysynk.app/privacy-requests"
    />

    <main className="container mx-auto max-w-3xl space-y-8 px-4 py-12">
      <header className="space-y-3">
        <Badge variant="outline" className="gap-1">
          <ShieldCheck className="h-3 w-3" aria-hidden="true" /> Privacy
        </Badge>
        <h1 className="text-3xl font-bold md:text-4xl">Submit a data request</h1>
        <p className="text-muted-foreground">
          Sign in and choose what you would like us to do with your personal data. You get a
          tracking reference straight away, a confirmation email, and a response within 30 days.
          See our{" "}
          <Link to="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>{" "}
          for what each right means.
        </p>
      </header>

      <PrivacyRequestsCard />

      <p className="text-sm text-muted-foreground">
        Cannot sign in? Email {LEGAL_CONFIG.PRIVACY_EMAIL} from the address on your account and we
        will verify you another way.
      </p>
    </main>

    <Footer />
  </div>
);

export default PrivacyRequests;
