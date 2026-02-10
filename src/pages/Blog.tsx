import { useState } from "react";
import { Calendar, User, ArrowRight, Mail } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageSEO } from "@/components/seo";

const Blog = () => {
  const [email, setEmail] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");

  const posts = [
    {
      title: "5 Tips for Finding the Perfect Creative Collaborator",
      excerpt: "Learn how to identify and connect with creatives who complement your skills and share your vision for successful projects.",
      author: "Amaka Okonkwo",
      date: "Jan 15, 2025",
      category: "Tips & Tricks",
      readTime: "5 min read"
    },
    {
      title: "How ArtistrySynk is Transforming Nigeria's Music Industry",
      excerpt: "Discover how producers and artists are using our platform to create chart-topping collaborations across Nigeria.",
      author: "Tunde Adeyemi",
      date: "Jan 10, 2025",
      category: "Success Stories",
      readTime: "8 min read"
    },
    {
      title: "The Rise of Pan-African Creative Collaboration",
      excerpt: "Explore how creatives from different African countries are breaking barriers and building together.",
      author: "Kwame Mensah",
      date: "Jan 5, 2025",
      category: "Industry Insights",
      readTime: "6 min read"
    },
    {
      title: "Building Your Creative Portfolio: A Complete Guide",
      excerpt: "Essential tips for showcasing your work effectively and attracting the right collaborators on ArtistrySynk.",
      author: "Zainab Mohammed",
      date: "Dec 28, 2024",
      category: "Tips & Tricks",
      readTime: "7 min read"
    },
    {
      title: "From Match to Masterpiece: A Filmmaker's Journey",
      excerpt: "How one filmmaker found their cinematographer on ArtistrySynk and created award-winning content together.",
      author: "David Okafor",
      date: "Dec 20, 2024",
      category: "Success Stories",
      readTime: "10 min read"
    },
    {
      title: "The Future of Creative Work in Africa",
      excerpt: "Trends, opportunities, and predictions for the African creative industry in 2025 and beyond.",
      author: "Chioma Nwankwo",
      date: "Dec 15, 2024",
      category: "Industry Insights",
      readTime: "12 min read"
    }
  ];

  const categories = ["All", "Tips & Tricks", "Success Stories", "Industry Insights"];

  const filteredPosts = activeCategory === "All" 
    ? posts 
    : posts.filter(post => post.category === activeCategory);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSubscribing(true);
    
    try {
      const { error } = await supabase.from("newsletter_subscribers").insert({
        email: email,
      });

      if (error) {
        // Check for duplicate email
        if (error.code === '23505') {
          toast.info("You're already subscribed!", {
            description: "This email is already on our newsletter list."
          });
        } else {
          throw error;
        }
      } else {
        toast.success("Successfully subscribed!", {
          description: "You'll receive our latest updates in your inbox."
        });
      }
      
      setEmail("");
    } catch (error) {
      console.error("Newsletter subscription error:", error);
      toast.error("Failed to subscribe. Please try again.");
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      <PageSEO
        title="Blog - Creative Collaboration Tips & Industry Insights"
        description="Read the latest articles on creative collaboration, music production tips, artist networking, and industry insights from ArtistrySynk."
        canonicalUrl="https://artistrysynk.com/blog"
        keywords="creative blog, music collaboration tips, artist networking, AfroBeats industry, creative professionals blog"
        breadcrumbs={[
          { name: "Home", url: "https://artistrysynk.com" },
          { name: "Blog", url: "https://artistrysynk.com/blog" }
        ]}
      />
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            The ArtistrySynk Blog
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Insights, stories, and tips for African creatives
          </p>
        </div>
      </section>

      {/* Categories */}
      <section className="px-4 mb-12">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-wrap gap-3 justify-center">
            {categories.map((category, index) => (
              <Button
                key={index}
                variant={activeCategory === category ? "hero" : "outline"}
                className="rounded-full"
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post, index) => (
              <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-border/50 flex flex-col">
                <CardHeader>
                  <div className="inline-block bg-gradient-to-r from-primary/10 to-secondary/10 px-3 py-1 rounded-full text-sm font-semibold text-primary mb-3 w-fit">
                    {post.category}
                  </div>
                  <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <p className="text-muted-foreground mb-4 flex-1">
                    {post.excerpt}
                  </p>
                  
                  <div className="space-y-3 pt-4 border-t border-border/50">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        <span>{post.author}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{post.date}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{post.readTime}</span>
                      <Button variant="ghost" size="sm" className="group-hover:text-primary">
                        Read More <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-20 px-4 bg-card/50">
        <div className="container mx-auto max-w-4xl text-center">
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5">
            <CardContent className="pt-8 pb-8">
              <Mail className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h2 className="text-3xl font-bold mb-4">
                Subscribe to Our Newsletter
              </h2>
              <p className="text-muted-foreground mb-6 text-lg">
                Get the latest insights, tips, and success stories delivered to your inbox
              </p>
              <form onSubmit={handleSubscribe} className="flex gap-3 max-w-md mx-auto">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                />
                <Button variant="hero" disabled={isSubscribing}>
                  {isSubscribing ? "Subscribing..." : "Subscribe"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Blog;