import { Trash2, Mail, Clock, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { PageSEO } from "@/components/seo";
import logoImg from "@/assets/logo.png";

const DataDeletion = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      <PageSEO
        title="Delete Your Account & Data - ArtistrySynk"
        description="Request deletion of your ArtistrySynk account and personal data, in-app or by email. Learn what is deleted, what is retained, and how long it takes."
        canonicalUrl="https://artistrysynk.app/data-deletion"
        breadcrumbs={[
          { name: "Home", url: "https://artistrysynk.app" },
          { name: "Account & Data Deletion", url: "https://artistrysynk.app/data-deletion" }
        ]}
      />

      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <img src={logoImg} alt="ArtistrySynk logo" className="h-40 w-auto mx-auto mb-6" />
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Account &amp; Data Deletion
          </h1>
          <p className="text-muted-foreground mb-4">Last updated: August 2026</p>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            You can delete your ArtistrySynk account and personal data at any time — from inside the app or by email.
          </p>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl space-y-8">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Trash2 className="w-6 h-6 text-primary" aria-hidden="true" /> Delete in the app
              </h2>
              <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
                <li>Sign in to ArtistrySynk (web or mobile app).</li>
                <li>Open <strong>Settings</strong> from your profile menu.</li>
                <li>Scroll to <strong>Account</strong> and choose <strong>Delete Account</strong>.</li>
                <li>Confirm the request. Your account is deactivated immediately.</li>
              </ol>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Mail className="w-6 h-6 text-primary" aria-hidden="true" /> Delete by email
              </h2>
              <p className="text-muted-foreground">
                If you cannot access your account, email{" "}
                <a href="mailto:privacy@artistrysynk.app" className="text-primary hover:underline">privacy@artistrysynk.app</a>{" "}
                from the address on your account with the subject <strong>“Delete my account”</strong>. We may ask you to verify
                ownership of the account before we proceed.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-primary" aria-hidden="true" /> What gets deleted
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Your login credentials and email address</li>
                <li>Profile details: name, bio, roles, genres, skills, location, social links</li>
                <li>Avatar and portfolio uploads</li>
                <li>Swipes, matches, messages you sent, and collaboration requests</li>
                <li>Device push notification tokens and session records</li>
                <li>Newsletter and notification preferences</li>
              </ul>
              <h3 className="font-bold mt-6 mb-2">What we may retain</h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Records we must keep for legal, tax, or payment-dispute reasons</li>
                <li>Moderation and safety records where needed to prevent abuse or ban evasion</li>
                <li>Aggregated, anonymised statistics that cannot identify you</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Clock className="w-6 h-6 text-primary" aria-hidden="true" /> How long it takes
              </h2>
              <p className="text-muted-foreground">
                Your profile stops being visible to other users immediately. Personal data is permanently removed from our
                production systems within <strong>30 days</strong>, and from encrypted backups within <strong>90 days</strong>.
                Deletion is permanent and cannot be undone.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-4">Questions</h2>
              <p className="text-muted-foreground">
                Contact <a href="mailto:privacy@artistrysynk.app" className="text-primary hover:underline">privacy@artistrysynk.app</a>.
                See also our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a> and{" "}
                <a href="/terms" className="text-primary hover:underline">Terms of Service</a>.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default DataDeletion;
