import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Calendar, Clock, User } from "lucide-react";
import { PageTransition } from "@/components/layout/PageTransition";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { fetchBlogPosts, formatBlogDate, type BlogPost } from "@/lib/blog";
import {
  buildPageHead,
  breadcrumbJsonLd,
  absoluteUrl,
} from "@/lib/seoHead";

export const Route = createFileRoute("/blog/archive")({
  loader: async (): Promise<BlogPost[]> => {
    const posts = await fetchBlogPosts();
    return posts;
  },
  head: ({ loaderData }) => {
    const itemCount = loaderData?.length ?? 0;
    return buildPageHead({
      path: "/blog/archive",
      title: "Blog Archive - Every Published Article",
      description:
        "Browse the full ArtistrySynk blog archive: every published article on creative collaboration, music production tips, artist networking and industry insights.",
      keywords:
        "blog archive, creative collaboration articles, music production articles, artist networking articles",
      jsonLd: [
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: "Archive", path: "/blog/archive" },
        ]),
        {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "ArtistrySynk Blog Archive",
          url: absoluteUrl("/blog/archive"),
          description:
            "Every published ArtistrySynk article on creative collaboration, music production and artist networking.",
          ...(itemCount > 0 && loaderData
            ? {
                mainEntity: {
                  "@type": "ItemList",
                  numberOfItems: itemCount,
                  itemListElement: loaderData.map((post, i) => ({
                    "@type": "ListItem",
                    position: i + 1,
                    name: post.title,
                    url: absoluteUrl(`/blog/${post.slug}`),
                  })),
                },
              }
            : {}),
        },
      ],
    });
  },
  component: BlogArchivePage,
});

function BlogArchivePage() {
  const posts = Route.useLoaderData();

  const byYear = posts.reduce<Record<string, BlogPost[]>>((acc, post) => {
    const year = formatBlogDate(post.published_at).slice(-4);
    (acc[year] ??= []).push(post);
    return acc;
  }, {});
  const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a));

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Blog Archive
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Every article we've published — creative collaboration tips, music
              production insights and stories from the ArtistrySynk community.
            </p>
            <Button asChild variant="outline" className="mt-6 rounded-full">
              <Link to="/blog">
                <ArrowRight className="w-4 h-4 mr-2" />
                Latest articles & categories
              </Link>
            </Button>
          </div>
        </section>

        <section className="pb-20 px-4">
          <div className="container mx-auto max-w-3xl">
            {posts.length === 0 ? (
              <p className="text-center text-muted-foreground py-16">
                No articles have been published yet. Check back soon.
              </p>
            ) : (
              years.map((year) => (
                <div key={year} className="mb-12">
                  <h2 className="text-2xl font-bold mb-6 border-b border-border/60 pb-2">
                    {year}
                    <span className="ml-3 text-sm font-normal text-muted-foreground">
                      {byYear[year].length} article{byYear[year].length === 1 ? "" : "s"}
                    </span>
                  </h2>
                  <ul className="space-y-8">
                    {byYear[year].map((post) => (
                      <li key={post.id}>
                        <article>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-gradient-to-r from-primary/10 to-secondary/10 px-3 py-0.5 rounded-full text-xs font-semibold text-primary">
                              {post.category}
                            </span>
                          </div>
                          <h3 className="text-xl font-bold mb-2">
                            <Link
                              to="/blog/$slug"
                              params={{ slug: post.slug }}
                              className="hover:text-primary transition-colors"
                            >
                              {post.title}
                            </Link>
                          </h3>
                          <p className="text-muted-foreground mb-3">{post.excerpt}</p>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
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
                        </article>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </section>

        <Footer />
      </div>
    </PageTransition>
  );
}
