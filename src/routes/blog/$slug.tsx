import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { ArrowLeft, Calendar, User, Clock } from "lucide-react";
import { PageTransition } from "@/components/layout/PageTransition";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { fetchBlogPost, formatBlogDate, type BlogPost } from "@/lib/blog";
import { buildPageHead, breadcrumbJsonLd, absoluteUrl, DEFAULT_OG_IMAGE } from "@/lib/seoHead";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }): Promise<BlogPost> => {
    const post = await fetchBlogPost(params.slug);
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return buildPageHead({
        path: "/blog",
        title: "Article Not Found | ArtistrySynk",
        description: "This article is unavailable.",
      });
    }
    const path = `/blog/${loaderData.slug}`;
    return buildPageHead({
      path,
      title: `${loaderData.title} | ArtistrySynk Blog`,
      description: loaderData.excerpt,
      ogType: "article",
      keywords: `${loaderData.category}, creative collaboration, ArtistrySynk blog`,
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: loaderData.title,
          description: loaderData.excerpt,
          image: DEFAULT_OG_IMAGE,
          url: absoluteUrl(path),
          mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(path) },
          datePublished: loaderData.published_at,
          author: { "@type": "Person", name: loaderData.author },
          publisher: {
            "@type": "Organization",
            name: "ArtistrySynk",
            logo: { "@type": "ImageObject", url: absoluteUrl("/logo.png") },
          },
        },
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: loaderData.title, path },
        ]),
      ],
    });
  },
  notFoundComponent: BlogPostNotFound,
  component: BlogPostPage,
});

function BlogPostPage() {
  const post = Route.useLoaderData();
  const paragraphs = post.content.split(/\n\n+/).filter(Boolean);

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">
        <article className="py-16 px-4">
          <div className="container mx-auto max-w-3xl">
            <Button asChild variant="ghost" size="sm" className="mb-8">
              <Link to="/blog">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Blog
              </Link>
            </Button>

            <div className="inline-block bg-gradient-to-r from-primary/10 to-secondary/10 px-3 py-1 rounded-full text-sm font-semibold text-primary mb-4">
              {post.category}
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">{post.title}</h1>

            <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground mb-10 pb-6 border-b border-border/50">
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4" /> {post.author}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> {formatBlogDate(post.published_at)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> {post.read_time}
              </span>
            </div>

            <div className="space-y-6">
              {paragraphs.map((paragraph, i) => (
                <p
                  key={i}
                  className={
                    i === 0
                      ? "text-xl leading-relaxed text-foreground/90"
                      : "text-lg leading-relaxed text-muted-foreground"
                  }
                >
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="mt-14 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 p-8 text-center">
              <h2 className="text-2xl font-bold mb-3">Find your next collaborator</h2>
              <p className="text-muted-foreground mb-6">
                Join ArtistrySynk and match with verified creatives who share your vision.
              </p>
              <Button asChild variant="hero">
                <Link to="/auth">Get started free</Link>
              </Button>
            </div>
          </div>
        </article>
        <Footer />
      </div>
    </PageTransition>
  );
}

function BlogPostNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-3xl font-bold">Article not found</h1>
      <p className="text-muted-foreground">This article may have been moved or unpublished.</p>
      <Button asChild variant="hero">
        <Link to="/blog">Back to Blog</Link>
      </Button>
    </div>
  );
}
