import { Shield, Eye, Lock, UserX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { PageSEO } from "@/components/seo";
import logoImg from "@/assets/logo.png";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      <PageSEO
        title="Privacy Policy - How We Protect Your Data"
        description="Learn how ArtistrySynk collects, uses, and protects your personal information. Your privacy matters to us."
        canonicalUrl="https://artistrysynk.app/privacy"
        breadcrumbs={[
          { name: "Home", url: "https://artistrysynk.app" },
          { name: "Privacy Policy", url: "https://artistrysynk.app/privacy" }
        ]}
      />
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <img src={logoImg} alt="ArtistrySynk" className="h-80 w-auto mx-auto mb-6" />
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground mb-4">Last updated: August 2026</p>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Your privacy is important to us. This policy explains how we collect, use, and protect your information.
          </p>
        </div>
      </section>

      {/* Quick Overview */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-6 mb-16">
            <Card className="text-center border-border/50">
              <CardContent className="pt-6">
                <Shield className="w-10 h-10 text-primary mx-auto mb-3" />
                <h3 className="font-bold mb-2">Secure</h3>
                <p className="text-sm text-muted-foreground">Bank-level encryption</p>
              </CardContent>
            </Card>
            <Card className="text-center border-border/50">
              <CardContent className="pt-6">
                <Eye className="w-10 h-10 text-primary mx-auto mb-3" />
                <h3 className="font-bold mb-2">Transparent</h3>
                <p className="text-sm text-muted-foreground">Clear data usage</p>
              </CardContent>
            </Card>
            <Card className="text-center border-border/50">
              <CardContent className="pt-6">
                <Lock className="w-10 h-10 text-primary mx-auto mb-3" />
                <h3 className="font-bold mb-2">Private</h3>
                <p className="text-sm text-muted-foreground">Your data is yours</p>
              </CardContent>
            </Card>
            <Card className="text-center border-border/50">
              <CardContent className="pt-6">
                <UserX className="w-10 h-10 text-primary mx-auto mb-3" />
                <h3 className="font-bold mb-2">Your Control</h3>
                <p className="text-sm text-muted-foreground">Delete anytime</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Policy Content */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="space-y-8">
            <Card className="border-border/50">
              <CardContent className="pt-6 prose prose-lg max-w-none">
                <h2 className="text-2xl font-bold mb-4">1. Information We Collect</h2>
                <p className="text-muted-foreground mb-4">
                  We collect information you provide directly to us when you:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Create an account (email, name, password)</li>
                  <li>Complete your profile (bio, creative role, genres, location, portfolio)</li>
                  <li>Use our services (swipes, matches, messages)</li>
                  <li>Contact our support team</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  We also automatically collect device information, IP addresses, and usage data to improve our service.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6 prose prose-lg max-w-none">
                <h2 className="text-2xl font-bold mb-4">2. How We Use Your Information</h2>
                <p className="text-muted-foreground mb-4">
                  We use the information we collect to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Provide, maintain, and improve our services</li>
                  <li>Match you with compatible creatives</li>
                  <li>Send you technical notices and support messages</li>
                  <li>Respond to your comments and questions</li>
                  <li>Detect and prevent fraud or abuse</li>
                  <li>Analyze usage patterns to enhance user experience</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6 prose prose-lg max-w-none">
                <h2 className="text-2xl font-bold mb-4">3. Information Sharing</h2>
                <p className="text-muted-foreground mb-4">
                  We do not sell your personal information. We may share your information only in these situations:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li><strong>With other users:</strong> Your profile information is visible to other users for matching purposes</li>
                  <li><strong>With your consent:</strong> When you explicitly agree to share information</li>
                  <li><strong>For legal reasons:</strong> If required by law or to protect our rights</li>
                  <li><strong>Service providers:</strong> Third-party services that help us operate (e.g., hosting, analytics)</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6 prose prose-lg max-w-none">
                <h2 className="text-2xl font-bold mb-4">4. Data Security</h2>
                <p className="text-muted-foreground">
                  We implement industry-standard security measures to protect your data, including:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
                  <li>Encryption of data in transit and at rest</li>
                  <li>Regular security audits</li>
                  <li>Secure authentication protocols</li>
                  <li>Limited employee access to personal data</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6 prose prose-lg max-w-none">
                <h2 className="text-2xl font-bold mb-4">5. Your Rights</h2>
                <p className="text-muted-foreground mb-4">
                  You have the right to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Access your personal data</li>
                  <li>Correct inaccurate data</li>
                  <li>Delete your account and data</li>
                  <li>Export your data</li>
                  <li>Opt-out of marketing communications</li>
                  <li>Object to certain data processing</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  To exercise these rights, contact us at privacy@artistrysynk.app
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6 prose prose-lg max-w-none">
                <h2 className="text-2xl font-bold mb-4">6. Data Retention</h2>
                <p className="text-muted-foreground">
                  We retain your information for as long as your account is active or as needed to provide services. When you delete your account, we delete your personal information within 30 days, except where we are required to retain it for legal purposes.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6 prose prose-lg max-w-none">
                <h2 className="text-2xl font-bold mb-4">6a. Mobile App Permissions</h2>
                <p className="text-muted-foreground mb-4">
                  Our iOS and Android apps request the following device permissions. Each one is optional, requested only at the
                  moment it is needed, and can be revoked in your device settings at any time:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li><strong>Camera:</strong> to take a photo for your avatar or portfolio. Photos are uploaded only when you confirm.</li>
                  <li><strong>Photo library:</strong> to select existing images for your avatar or portfolio.</li>
                  <li><strong>Notifications:</strong> to send push alerts about matches, messages and collaboration requests. We store a device push token, which is deleted when you sign out or delete your account.</li>
                  <li><strong>Approximate location (optional):</strong> only if you choose to enable nearby discovery, to show creatives close to you.</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  The apps do not access your contacts, microphone, call logs, SMS, or precise background location, and we do not
                  sell or share device data with advertisers or data brokers.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6 prose prose-lg max-w-none">
                <h2 className="text-2xl font-bold mb-4">6b. Deleting Your Account and Data</h2>
                <p className="text-muted-foreground">
                  You can delete your account and personal data at any time from <strong>Settings → Account → Delete Account</strong>,
                  or by emailing privacy@artistrysynk.app. Full details of what is deleted, what we must retain, and timelines are on
                  our <a href="/data-deletion" className="text-primary hover:underline">Account &amp; Data Deletion</a> page.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6 prose prose-lg max-w-none">
                <h2 className="text-2xl font-bold mb-4">7. Children's Privacy</h2>
                <p className="text-muted-foreground">
                  ArtistrySynk is not intended for users under 18 years of age. We do not knowingly collect information from children under 18. If you believe we have collected information from a child under 18, please contact us immediately.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6 prose prose-lg max-w-none">
                <h2 className="text-2xl font-bold mb-4">8. Changes to This Policy</h2>
                <p className="text-muted-foreground">
                  We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date. Continued use of our service after changes constitutes acceptance of the updated policy.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6 prose prose-lg max-w-none">
                <h2 className="text-2xl font-bold mb-4">9. Contact Us</h2>
                <p className="text-muted-foreground">
                  If you have questions about this Privacy Policy, please contact us at:
                </p>
                <ul className="list-none space-y-2 text-muted-foreground mt-4">
                  <li><strong>Email:</strong> privacy@artistrysynk.app</li>
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

export default Privacy;
