import { useState } from "react";
import { Briefcase, MapPin, Clock, Send, Upload } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageSEO } from "@/components/seo";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Job {
  title: string;
  department: string;
  location: string;
  type: string;
  description: string;
}

const Careers = () => {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    portfolio: "",
    coverLetter: ""
  });

  const openings: Job[] = [
    {
      title: "Senior Frontend Developer",
      department: "Engineering",
      location: "Lagos, Nigeria (Remote)",
      type: "Full-time",
      description: "Build beautiful, responsive interfaces for African creatives using React, TypeScript, and modern web technologies."
    },
    {
      title: "Product Designer",
      department: "Design",
      location: "Remote",
      type: "Full-time",
      description: "Shape the user experience for thousands of creatives. Design intuitive interfaces that make collaboration seamless."
    },
    {
      title: "Community Manager",
      department: "Marketing",
      location: "Lagos, Nigeria",
      type: "Full-time",
      description: "Engage with our creative community, organize events, and help grow our presence across Africa."
    },
    {
      title: "Backend Engineer",
      department: "Engineering",
      location: "Remote",
      type: "Full-time",
      description: "Build scalable backend systems to support millions of creatives. Work with Node.js, PostgreSQL, and cloud infrastructure."
    }
  ];

  const perks = [
    "Competitive salary in NGN/USD",
    "Remote-first culture",
    "Health insurance",
    "Learning & development budget",
    "Flexible working hours",
    "Annual team retreats",
    "Latest tech equipment",
    "Stock options"
  ];

  const handleApply = (job: Job) => {
    setSelectedJob(job);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.coverLetter) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.from("career_applications").insert({
        job_title: selectedJob?.title || "General Application",
        department: selectedJob?.department || "Various",
        full_name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        portfolio_url: formData.portfolio || null,
        cover_letter: formData.coverLetter,
      });

      if (error) throw error;
      
      toast.success("Application submitted!", {
        description: `Thanks for applying for ${selectedJob?.title}. We'll review your application and get back to you soon.`
      });
      
      setFormData({ name: "", email: "", phone: "", portfolio: "", coverLetter: "" });
      setIsOpen(false);
    } catch (error) {
      console.error("Application error:", error);
      toast.error("Failed to submit application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGeneralApply = () => {
    setSelectedJob({ 
      title: "General Application", 
      department: "Various", 
      location: "Remote", 
      type: "Full-time",
      description: "Open application for future opportunities"
    });
    setIsOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      <PageSEO
        title="Careers - Join Our Team | Artistry.ng"
        description="Help us build the future of creative collaboration in Africa. Explore open positions in engineering, design, and marketing with competitive pay and remote-first culture."
        canonicalUrl="https://artistry.ng/careers"
        keywords="Artistry.ng jobs, creative tech jobs Nigeria, African startup careers, remote jobs Africa, Lagos tech jobs"
        breadcrumbs={[
          { name: "Home", url: "https://artistry.ng" },
          { name: "Careers", url: "https://artistry.ng/careers" }
        ]}
      />
      
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Join Our Team
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Help us build the future of creative collaboration in Africa
          </p>
        </div>
      </section>

      {/* Culture Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="border-border/50">
            <CardContent className="pt-8">
              <h2 className="text-3xl font-bold mb-6 text-center">Why Artistry.ng?</h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                We're not just building a product—we're creating a movement. At Artistry.ng, you'll work on meaningful problems that impact millions of African creatives. We value innovation, collaboration, and most importantly, the creative spirit.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                {perks.map((perk, index) => (
                  <div key={index} className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <span>{perk}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Open Positions */}
      <section className="py-20 px-4 bg-card/50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">
            Open Positions
          </h2>
          <div className="grid gap-6">
            {openings.map((job, index) => (
              <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-border/50">
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-bold mb-2">{job.title}</h3>
                      <p className="text-primary font-semibold">{job.department}</p>
                    </div>
                    <Button variant="hero" onClick={() => handleApply(job)}>
                      Apply Now
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{job.description}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{job.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{job.type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      <span>{job.department}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* No Opening Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5">
            <CardContent className="pt-8 pb-8">
              <h2 className="text-3xl font-bold mb-4">
                Don't see the right role?
              </h2>
              <p className="text-muted-foreground mb-6 text-lg">
                We're always looking for exceptional talent. Send us your resume and tell us why you'd be a great fit for Artistry.ng.
              </p>
              <Button variant="outline" size="lg" onClick={handleGeneralApply}>
                <Upload className="w-4 h-4 mr-2" />
                Send Resume
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Application Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply for {selectedJob?.title}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Full Name *</label>
              <Input 
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Email Address *</label>
              <Input 
                type="email" 
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Phone Number</label>
              <Input 
                type="tel" 
                placeholder="+234 800 000 0000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Portfolio/LinkedIn URL</label>
              <Input 
                placeholder="https://your-portfolio.com"
                value={formData.portfolio}
                onChange={(e) => setFormData({ ...formData, portfolio: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Why should we hire you? *</label>
              <Textarea 
                placeholder="Tell us about your experience and why you'd be a great fit..."
                className="min-h-[120px]"
                value={formData.coverLetter}
                onChange={(e) => setFormData({ ...formData, coverLetter: e.target.value })}
              />
            </div>
            <Button variant="hero" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>Submitting...</>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Application
                </>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Careers;