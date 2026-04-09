import { FileText, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { PageSEO } from "@/components/seo";
import logoImg from "@/assets/logo.png";

const Terms = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      <PageSEO
        title="Terms of Service - ArtistrySynk Platform Rules"
        description="Read the ArtistrySynk terms of service. Understand the rules and guidelines for using our creative collaboration platform."
        canonicalUrl="https://artistrysynk.com/terms"
        breadcrumbs={[
          { name: "Home", url: "https://artistrysynk.com" },
          { name: "Terms of Service", url: "https://artistrysynk.com/terms" }
        ]}
      />
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <img src={logoImg} alt="ArtistrySynk" className="h-80 w-auto mx-auto mb-6" />
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Terms of Service
          </h1>
          <p className="text-muted-foreground mb-4">Last updated: January 2025</p>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Please read these terms carefully before using ArtistrySynk
          </p>
        </div>
      </section>

      {/* Quick Summary */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <CheckCircle className="w-10 h-10 text-primary mb-3" />
                <h3 className="font-bold mb-2">You Can</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Create and share your profile</li>
                  <li>• Connect with other creatives</li>
                  <li>• Message your matches</li>
                  <li>• Cancel anytime</li>
                </ul>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <XCircle className="w-10 h-10 text-destructive mb-3" />
                <h3 className="font-bold mb-2">You Cannot</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Create fake profiles</li>
                  <li>• Harass other users</li>
                  <li>• Share offensive content</li>
                  <li>• Use for spam or scams</li>
                </ul>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <AlertCircle className="w-10 h-10 text-accent mb-3" />
                <h3 className="font-bold mb-2">We Can</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Remove inappropriate content</li>
                  <li>• Suspend violating accounts</li>
                  <li>• Update these terms</li>
                  <li>• Improve our service</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Terms Content */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="space-y-8">
            <Card className="border-border/50">
              <CardContent className="pt-6 prose prose-lg max-w-none">
                <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
                <p className="text-muted-foreground">
                  By accessing or using ArtistrySynk, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using this service.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6 prose prose-lg max-w-none">
                <h2 className="text-2xl font-bold mb-4">2. Eligibility</h2>
                <p className="text-muted-foreground mb-4">
                  To use ArtistrySynk, you must:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Be at least 18 years old</li>
                  <li>Provide accurate and truthful information</li>
                  <li>Not be prohibited from using the service under applicable laws</li>
                  <li>Not have been previously banned from the platform</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6 prose prose-lg max-w-none">
                <h2 className="text-2xl font-bold mb-4">3. Account Registration</h2>
                <p className="text-muted-foreground mb-4">
                  When you create an account, you agree to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Provide accurate, current, and complete information</li>
                  <li>Maintain and update your information as needed</li>
                  <li>Keep your password secure and confidential</li>
                  <li>Notify us immediately of any unauthorized access</li>
                  <li>Accept responsibility for all activities under your account</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6 prose prose-lg max-w-none">
                <h2 className="text-2xl font-bold mb-4">4. User Conduct</h2>
                <p className="text-muted-foreground mb-4">
                  You agree NOT to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Create fake or misleading profiles</li>
                  <li>Impersonate any person or entity</li>
                  <li>Harass, abuse, or harm other users</li>
                  <li>Post offensive, discriminatory, or illegal content</li>
                  <li>Use the service for commercial solicitation or spam</li>
                  <li>Attempt to hack or compromise platform security</li>
                  <li>Scrape or collect user data without permission</li>
                  <li>Use the platform for any illegal activities</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6 prose prose-lg max-w-none">
                <h2 className="text-2xl font-bold mb-4">5. Content Ownership</h2>
                <p className="text-muted-foreground mb-4">
                  You retain ownership of all content you submit to ArtistrySynk. However, by posting content, you grant us a worldwide, non-exclusive, royalty-free license to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Display your content on the platform</li>
                  <li>Store and process your content to provide services</li>
                  <li>Use your content in marketing materials (with your permission)</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  You are responsible for ensuring you have the rights to any content you post.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6 prose prose-lg max-w-none">
                <h2 className="text-2xl font-bold mb-4">6. Prohibited Content</h2>
                <p className="text-muted-foreground mb-4">
                  You may not post content that:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Is illegal, harmful, or violates others' rights</li>
                  <li>Contains nudity or sexually explicit material</li>
                  <li>Promotes violence, hate speech, or discrimination</li>
                  <li>Infringes on intellectual property rights</li>
                  <li>Contains malware, viruses, or harmful code</li>
                  <li>Is misleading or fraudulent</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6 prose prose-lg max-w-none">
                <h2 className="text-2xl font-bold mb-4">7. Termination</h2>
                <p className="text-muted-foreground mb-4">
                  We reserve the right to suspend or terminate your account if you:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Violate these Terms of Service</li>
                  <li>Engage in fraudulent or illegal activities</li>
                  <li>Abuse or harass other users</li>
                  <li>Post prohibited content</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  You may delete your account at any time from your profile settings.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6 prose prose-lg max-w-none">
                <h2 className="text-2xl font-bold mb-4">8. Disclaimer of Warranties</h2>
                <p className="text-muted-foreground">
                  ArtistrySynk is provided "as is" without warranties of any kind. We do not guarantee that the service will be uninterrupted, error-free, or secure. We are not responsible for the conduct of other users or the accuracy of user-provided information.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6 prose prose-lg max-w-none">
                <h2 className="text-2xl font-bold mb-4">9. Limitation of Liability</h2>
                <p className="text-muted-foreground">
                  To the fullest extent permitted by law, ArtistrySynk shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service. Our total liability shall not exceed the amount you paid us in the past 12 months (if any).
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6 prose prose-lg max-w-none">
                <h2 className="text-2xl font-bold mb-4">10. Changes to Terms</h2>
                <p className="text-muted-foreground">
                  We may modify these terms at any time. We will notify you of significant changes via email or platform notification. Continued use of the service after changes constitutes acceptance of the new terms.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6 prose prose-lg max-w-none">
                <h2 className="text-2xl font-bold mb-4">11. Governing Law</h2>
                <p className="text-muted-foreground">
                  These Terms shall be governed by the laws of the Federal Republic of Nigeria. Any disputes shall be resolved in the courts of Lagos, Nigeria.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6 prose prose-lg max-w-none">
                <h2 className="text-2xl font-bold mb-4">12. Contact Information</h2>
                <p className="text-muted-foreground">
                  If you have questions about these Terms, contact us at:
                </p>
                <ul className="list-none space-y-2 text-muted-foreground mt-4">
                  <li><strong>Email:</strong> legal@artistrysynk.com</li>
                  <li><strong>Address:</strong> Lagos, Nigeria</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Terms;
