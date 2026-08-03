import { useState, useRef } from "react";
import { Mail, MessageCircle, MapPin, Phone, Send } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageSEO, FAQSchema } from "@/components/seo";
import logoImg from "@/assets/logo.png";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  contactSchema,
  detectSpam,
  checkRateLimit,
  recordSubmission,
  buildReferenceId,
  MIN_FILL_MS,
} from "@/lib/contactSpamGuard";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const mountedAt = useRef(Date.now());
  const [reference, setReference] = useState<string | null>(null);

  const contactInfo = [
    {
      icon: Mail,
      title: "Email Us",
      info: "hello@artistrysynk.app",
      description: "We'll respond within 24 hours"
    },
    {
      icon: Phone,
      title: "Call Us",
      info: "+234 (0) 800 ARTIST",
      description: "Mon-Fri, 9AM-6PM WAT"
    },
    {
      icon: MapPin,
      title: "Visit Us",
      info: "Lagos, Nigeria",
      description: "Schedule an appointment first"
    },
    {
      icon: MessageCircle,
      title: "Live Chat",
      info: "Available in-app",
      description: "Instant support for members"
    }
  ];

  const contactFaqs = [
    {
      question: "How do I reset my ArtistrySynk password?",
      answer: "Click on 'Forgot Password' on the login page and follow the instructions sent to your email."
    },
    {
      question: "How do I delete my ArtistrySynk account?",
      answer: "Go to Settings → Account → Delete Account. Note that this action is permanent and cannot be undone."
    },
    {
      question: "Can I change my creative role on ArtistrySynk?",
      answer: "Yes! Go to your Profile settings and update your creative role and genres at any time."
    },
    {
      question: "How does matching work on ArtistrySynk?",
      answer: "Our algorithm considers your role, location, genres, and preferences to show you compatible creatives. When you both like each other, it's a match!"
    },
    {
      question: "Is ArtistrySynk really free?",
      answer: "Yes! Our core features including unlimited matches and messaging are completely free. We offer premium features for those who want advanced capabilities."
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Bot traps: hidden field must stay empty, form must not be filled instantly.
    if (honeypot.trim() !== "") {
      toast.error("Submission blocked.");
      return;
    }
    if (Date.now() - mountedAt.current < MIN_FILL_MS) {
      toast.error("That was too fast — please take a moment and try again.");
      return;
    }

    const parsed = contactSchema.safeParse(formData);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Please check your details");
      return;
    }

    const spamReason = detectSpam(parsed.data);
    if (spamReason) {
      toast.error(spamReason);
      return;
    }

    const limited = checkRateLimit();
    if (limited) {
      toast.error(limited);
      return;
    }

    setIsSubmitting(true);
    
    try {
      const clean = parsed.data;
      const haystack = `${clean.subject} ${clean.message}`.toLowerCase();
      const category = /privacy|gdpr|data (deletion|request|export)|delete my (account|data)|personal data|cookie/.test(haystack)
        ? "privacy"
        : "support";

      // Save to database
      const { data: inserted, error } = await supabase
        .from("contact_submissions")
        .insert({
          name: clean.name,
          email: clean.email,
          phone: clean.phone || null,
          subject: clean.subject,
          message: clean.message,
          category,
        } as any)
        .select("id")
        .single();

      if (error) throw error;

      const referenceId = buildReferenceId(inserted!.id, category);
      recordSubmission();

      // Send confirmation to the sender + routed copy to the support inbox
      try {
        await supabase.functions.invoke("send-contact-confirmation", {
          body: {
            name: clean.name,
            email: clean.email,
            phone: clean.phone || null,
            subject: clean.subject,
            message: clean.message,
            category,
            referenceId,
          },
        });
      } catch (emailError) {
        console.error("Failed to send confirmation email:", emailError);
        // Don't fail the submission if email fails
      }

      setReference(referenceId);
      toast.success(`Message sent — reference ${referenceId}`, {
        description: "We've emailed you a confirmation. We'll get back to you within 24 hours."
      });
      
      setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
      mountedAt.current = Date.now();
    } catch (error) {
      console.error("Contact submission error:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      <PageSEO
        title="Contact Us - Get In Touch | ArtistrySynk"
        description="Have questions about ArtistrySynk? Contact us via email, phone, or live chat. We respond within 24 hours. Lagos, Nigeria based support team."
        canonicalUrl="https://artistrysynk.app/contact"
        keywords="contact ArtistrySynk, creative platform support, ArtistrySynk help, Lagos Nigeria contact"
        breadcrumbs={[
          { name: "Home", url: "https://artistrysynk.app" },
          { name: "Contact", url: "https://artistrysynk.app/contact" }
        ]}
      />
      <FAQSchema faqs={contactFaqs} />
      
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <img src={logoImg} alt="ArtistrySynk" className="h-80 w-auto mx-auto mb-6" />
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Get In Touch
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>
        </div>
      </section>

      {/* Contact Grid */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {contactInfo.map((item, index) => (
              <Card key={index} className="text-center group hover:shadow-xl transition-all duration-300 border-border/50">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <item.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold mb-2">{item.title}</h3>
                  <p className="text-primary font-semibold mb-1">{item.info}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Contact Form */}
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-border/50">
              <CardHeader>
                <h2 className="text-2xl font-bold">Send Us a Message</h2>
                <p className="text-muted-foreground">Fill out the form and we'll get back to you shortly</p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {reference && (
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                      Your reference ID is <strong>{reference}</strong>. Quote it in any follow-up email.
                    </div>
                  )}
                  {/* Honeypot: hidden from users, filled by bots */}
                  <input
                    type="text"
                    name="company_website"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    className="absolute left-[-9999px] h-0 w-0 opacity-0"
                  />
                  <div>
                    <label className="text-sm font-medium mb-2 block">Full Name</label>
                    <Input 
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Email Address</label>
                    <Input 
                      type="email" 
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Phone Number (Optional)</label>
                    <Input 
                      type="tel" 
                      placeholder="+234 800 000 0000"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Subject</label>
                    <Input 
                      placeholder="How can we help?"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Message</label>
                    <Textarea 
                      placeholder="Tell us more about your inquiry..."
                      className="min-h-[150px]"
                      maxLength={2000}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">{formData.message.length}/2000 characters</p>
                  </div>
                  <Button variant="hero" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>Sending...</>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* FAQ */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
              
              {contactFaqs.map((faq, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <h3 className="font-bold mb-2">{faq.question}</h3>
                    <p className="text-muted-foreground text-sm">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Contact;