import { useState, useRef, useEffect, useCallback } from "react";
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
import { contactSchema, detectSpam, checkRateLimit, recordSubmission } from "@/lib/contactSpamGuard";
import { useServerFn } from "@tanstack/react-start";
import { submitContactSupport } from "@/lib/submit-contact-support.functions";

type SubmissionReceipt = {
  referenceId: string;
  category: string;
  submittedAt: string;
  emailQueued: boolean;
};

declare global {
  interface Window {
    hcaptcha?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
    };
  }
}

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
  const [receipt, setReceipt] = useState<SubmissionReceipt | null>(null);
  const [captcha, setCaptcha] = useState<{ siteKey: string } | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaBox = useRef<HTMLDivElement | null>(null);
  const captchaWidget = useRef<string | null>(null);

  // Load and render the hCaptcha widget only once the server asks for it.
  useEffect(() => {
    if (!captcha) return;
    let cancelled = false;

    const render = () => {
      if (cancelled || !captchaBox.current || !window.hcaptcha || captchaWidget.current) return;
      captchaWidget.current = window.hcaptcha.render(captchaBox.current, {
        sitekey: captcha.siteKey,
        callback: (token: string) => setCaptchaToken(token),
        "expired-callback": () => setCaptchaToken(null),
        "error-callback": () => setCaptchaToken(null),
      });
    };

    if (window.hcaptcha) {
      render();
    } else if (!document.getElementById("hcaptcha-script")) {
      const script = document.createElement("script");
      script.id = "hcaptcha-script";
      script.src = "https://js.hcaptcha.com/1/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = render;
      document.head.appendChild(script);
    } else {
      document.getElementById("hcaptcha-script")?.addEventListener("load", render);
    }

    return () => {
      cancelled = true;
    };
  }, [captcha]);

  const resetCaptcha = useCallback(() => {
    setCaptchaToken(null);
    if (window.hcaptcha && captchaWidget.current) window.hcaptcha.reset(captchaWidget.current);
  }, []);

  const contactInfo = [
    {
      icon: Mail,
      title: "Email Us",
      info: "ourownconcepts@gmail.com",
      description: "We'll respond within 24 hours"
    },
    {
      icon: Phone,
      title: "Call Us",
      info: "+234 906 931 2437",
      description: "Mon-Fri, 9AM-6PM WAT"
    },
    {
      icon: MapPin,
      title: "Visit Us",
      info: "Ibadan, Oyo State, Nigeria",
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

  const submitContactSupportFn = useServerFn(submitContactSupport);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side checks are a fast first pass; the server re-runs all of them.
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

    if (captcha && !captchaToken) {
      toast.error("Please complete the verification challenge before sending.");
      return;
    }

    setIsSubmitting(true);

    try {
      const clean = parsed.data;
      // All validation, rate limiting, bot protection and auditing happen server-side.
      const payload = await submitContactSupportFn({
        data: {
          name: clean.name,
          email: clean.email,
          phone: clean.phone || null,
          subject: clean.subject,
          message: clean.message,
          honeypot,
          elapsedMs: Date.now() - mountedAt.current,
          captchaToken: captchaToken ?? undefined,
        },
      });

      if (payload?.captchaRequired && payload.siteKey) {
        setCaptcha({ siteKey: payload.siteKey });
        resetCaptcha();
        toast.error("Extra verification needed", {
          description: payload.error ?? "Please complete the challenge and send again.",
        });
        return;
      }

      if (!payload?.success) {
        toast.error(payload?.error ?? "Failed to send message. Please try again.");
        return;
      }

      recordSubmission();
      resetCaptcha();
      setCaptcha(null);
      setReceipt({
        referenceId: payload.referenceId!,
        category: payload.category ?? "support",
        submittedAt: payload.submittedAt ?? new Date().toISOString(),
        emailQueued: payload.emailQueued ?? false,
      });
      toast.success(`Message sent — reference ${payload.referenceId}`, {
        description: "We've emailed you a confirmation. We'll get back to you within 24 hours.",
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
                  {receipt && (
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm space-y-1" role="status">
                      <p className="font-semibold">Ticket created</p>
                      <p>
                        Reference ID: <strong>{receipt.referenceId}</strong>
                      </p>
                      <p className="text-muted-foreground">
                        Type: {receipt.category === "privacy" ? "Privacy request" : "Support request"} · Logged{" "}
                        {new Date(receipt.submittedAt).toLocaleString()}
                      </p>
                      <p className="text-muted-foreground">
                        {receipt.emailQueued
                          ? "A confirmation email is on its way — quote this reference in any follow-up."
                          : "Save this reference — quote it in any follow-up email."}
                      </p>
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
                    <label htmlFor="contact-name" className="text-sm font-medium mb-2 block">Full Name</label>
                    <Input 
                      id="contact-name"
                      name="name"
                      autoComplete="name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="text-sm font-medium mb-2 block">Email Address</label>
                    <Input 
                      id="contact-email"
                      name="email"
                      autoComplete="email"
                      type="email" 
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-phone" className="text-sm font-medium mb-2 block">Phone Number (Optional)</label>
                    <Input 
                      id="contact-phone"
                      name="phone"
                      autoComplete="tel"
                      type="tel" 
                      placeholder="+234 800 000 0000"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-subject" className="text-sm font-medium mb-2 block">Subject</label>
                    <Input 
                      id="contact-subject"
                      name="subject"
                      placeholder="How can we help?"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-message" className="text-sm font-medium mb-2 block">Message</label>
                    <Textarea 
                      id="contact-message"
                      name="message"
                      aria-describedby="contact-message-count"
                      placeholder="Tell us more about your inquiry..."
                      className="min-h-[150px]"
                      maxLength={2000}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                    <p id="contact-message-count" className="mt-1 text-xs text-muted-foreground">{formData.message.length}/2000 characters</p>
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
                  {captcha && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        For security, please confirm you're human before sending.
                      </p>
                      <div ref={captchaBox} aria-label="Human verification challenge" />
                    </div>
                  )}
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