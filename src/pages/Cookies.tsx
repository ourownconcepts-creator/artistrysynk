import { Cookie, Settings, BarChart3, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { PageSEO } from "@/components/seo";
import { toast } from "sonner";
import logoImg from "@/assets/logo.png";

const Cookies = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      <PageSEO
        title="Cookie Policy - How We Use Cookies"
        description="Learn about how ArtistrySynk uses cookies and similar technologies to improve your experience on our platform."
        canonicalUrl="https://artistrysynk.app/cookies"
        breadcrumbs={[
          { name: "Home", url: "https://artistrysynk.app" },
          { name: "Cookie Policy", url: "https://artistrysynk.app/cookies" }
        ]}
      />
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <img src={logoImg} alt="ArtistrySynk" className="h-80 w-auto mx-auto mb-6" />
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Cookie Policy
          </h1>
          <p className="text-muted-foreground mb-4">Last updated: January 2025</p>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Learn how we use cookies and similar technologies to provide and improve our service
          </p>
        </div>
      </section>

      {/* Cookie Types Overview */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-6 mb-16">
            <Card className="text-center border-border/50">
              <CardContent className="pt-6">
                <Cookie className="w-10 h-10 text-primary mx-auto mb-3" />
                <h3 className="font-bold mb-2">Essential</h3>
                <p className="text-sm text-muted-foreground">Required for the site to work</p>
              </CardContent>
            </Card>
            <Card className="text-center border-border/50">
              <CardContent className="pt-6">
                <Settings className="w-10 h-10 text-secondary mx-auto mb-3" />
                <h3 className="font-bold mb-2">Functional</h3>
                <p className="text-sm text-muted-foreground">Remember your preferences</p>
              </CardContent>
            </Card>
            <Card className="text-center border-border/50">
              <CardContent className="pt-6">
                <BarChart3 className="w-10 h-10 text-accent mx-auto mb-3" />
                <h3 className="font-bold mb-2">Analytics</h3>
                <p className="text-sm text-muted-foreground">Help us improve</p>
              </CardContent>
            </Card>
            <Card className="text-center border-border/50">
              <CardContent className="pt-6">
                <Shield className="w-10 h-10 text-primary mx-auto mb-3" />
                <h3 className="font-bold mb-2">Security</h3>
                <p className="text-sm text-muted-foreground">Keep you safe</p>
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
                <h2 className="text-2xl font-bold mb-4">What Are Cookies?</h2>
                <p className="text-muted-foreground">
                  Cookies are small text files that are stored on your device when you visit a website. They help us provide you with a better experience by remembering your preferences, keeping you logged in, and understanding how you use our service.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6 prose prose-lg max-w-none">
                <h2 className="text-2xl font-bold mb-4">How We Use Cookies</h2>
                <p className="text-muted-foreground mb-4">
                  We use cookies for several purposes:
                </p>
                
                <h3 className="text-xl font-bold mt-6 mb-3">1. Essential Cookies (Always Active)</h3>
                <p className="text-muted-foreground mb-2">
                  These cookies are necessary for the website to function and cannot be switched off. They include:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Authentication cookies to keep you logged in</li>
                  <li>Session cookies to maintain your browsing session</li>
                  <li>Security cookies to protect against fraud</li>
                  <li>Load balancing cookies for site performance</li>
                </ul>

                <h3 className="text-xl font-bold mt-6 mb-3">2. Functional Cookies</h3>
                <p className="text-muted-foreground mb-2">
                  These cookies enable enhanced functionality and personalization:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Remembering your language preference</li>
                  <li>Storing your display settings (dark/light mode)</li>
                  <li>Saving your location preferences</li>
                  <li>Remembering items in your favorites</li>
                </ul>

                <h3 className="text-xl font-bold mt-6 mb-3">3. Analytics Cookies</h3>
                <p className="text-muted-foreground mb-2">
                  These cookies help us understand how visitors interact with our website:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Which pages are visited most often</li>
                  <li>How long users spend on each page</li>
                  <li>What links are clicked</li>
                  <li>Error messages that appear</li>
                </ul>
                <p className="text-muted-foreground mt-2">
                  We use this data to improve our service. All analytics data is anonymized.
                </p>

                <h3 className="text-xl font-bold mt-6 mb-3">4. Marketing Cookies</h3>
                <p className="text-muted-foreground mb-2">
                  These cookies track your activity to deliver relevant advertisements:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Showing you ads based on your interests</li>
                  <li>Limiting the number of times you see an ad</li>
                  <li>Measuring ad campaign effectiveness</li>
                </ul>
                <p className="text-muted-foreground mt-2">
                  You can opt out of marketing cookies through your cookie preferences.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6 prose prose-lg max-w-none">
                <h2 className="text-2xl font-bold mb-4">Third-Party Cookies</h2>
                <p className="text-muted-foreground mb-4">
                  We use services from trusted third parties that may set cookies on your device:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li><strong>Google Analytics:</strong> To understand site usage and improve our service</li>
                  <li><strong>Social Media:</strong> For social sharing features (if you use them)</li>
                  <li><strong>Payment Providers:</strong> To process payments securely</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  These third parties have their own privacy policies governing their use of cookies.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6 prose prose-lg max-w-none">
                <h2 className="text-2xl font-bold mb-4">Cookie Duration</h2>
                <p className="text-muted-foreground mb-4">
                  Cookies can be either:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li><strong>Session cookies:</strong> Deleted when you close your browser</li>
                  <li><strong>Persistent cookies:</strong> Remain on your device for a set period or until you delete them</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6 prose prose-lg max-w-none">
                <h2 className="text-2xl font-bold mb-4">Managing Your Cookie Preferences</h2>
                <p className="text-muted-foreground mb-4">
                  You have control over which cookies you accept:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li><strong>Cookie Banner:</strong> When you first visit, you can choose which types of cookies to accept</li>
                  <li><strong>Browser Settings:</strong> Most browsers allow you to refuse or delete cookies through their settings</li>
                  <li><strong>Opt-Out Tools:</strong> You can opt out of third-party cookies through industry opt-out pages</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  Note: Blocking essential cookies may prevent you from using certain features of our service.
                </p>
                <div className="mt-6">
                  <Button
                    variant="hero"
                    onClick={() => {
                      localStorage.removeItem("as_cookie_consent");
                      toast.success("Cookie preferences reset", {
                        description: "The consent banner will reappear so you can choose again.",
                      });
                      setTimeout(() => window.location.reload(), 800);
                    }}
                  >
                    Manage Cookie Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6 prose prose-lg max-w-none">
                <h2 className="text-2xl font-bold mb-4">Browser Cookie Settings</h2>
                <p className="text-muted-foreground mb-4">
                  Learn how to manage cookies in popular browsers:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li><strong>Chrome:</strong> Settings → Privacy and Security → Cookies</li>
                  <li><strong>Firefox:</strong> Options → Privacy & Security → Cookies</li>
                  <li><strong>Safari:</strong> Preferences → Privacy → Cookies</li>
                  <li><strong>Edge:</strong> Settings → Privacy → Cookies</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6 prose prose-lg max-w-none">
                <h2 className="text-2xl font-bold mb-4">Changes to This Policy</h2>
                <p className="text-muted-foreground">
                  We may update this Cookie Policy from time to time. Any changes will be posted on this page with an updated "Last updated" date. We encourage you to review this policy periodically.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6 prose prose-lg max-w-none">
                <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
                <p className="text-muted-foreground">
                  If you have questions about our use of cookies, please contact us at:
                </p>
                <ul className="list-none space-y-2 text-muted-foreground mt-4">
                  <li><strong>Company:</strong> Lomodogs Dot Nigeria Limited</li>
                  <li><strong>Email:</strong> ourownconcepts@gmail.com</li>
                  <li><strong>Phone:</strong> +234 906 931 2437</li>
                  <li><strong>Address:</strong> 6 Oluyoro Street, off Awolowo Avenue, Bodija, Ibadan, Oyo State, Nigeria</li>
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

export default Cookies;
