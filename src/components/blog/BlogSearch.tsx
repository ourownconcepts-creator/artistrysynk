import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "@/lib/router-compat";
import { fetchBlogPosts, formatBlogDate, type BlogPost } from "@/lib/blog";

/** Search published blog articles by title, excerpt, category or keyword. */
export function BlogSearch({ heading = "Search the ArtistrySynk Blog" }: { heading?: string }) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetchBlogPosts().then(setPosts).catch(() => setPosts([]));
  }, []);

  const results = useMemo(() => {
    const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const list = terms.length
      ? posts.filter((p) => {
          const hay = `${p.title} ${p.excerpt} ${p.category}`.toLowerCase();
          return terms.every((t) => hay.includes(t));
        })
      : posts;
    return list.slice(0, 6);
  }, [q, posts]);

  return (
    <section aria-labelledby="blog-search-heading" className="container mx-auto max-w-5xl px-4 py-14">
      <h2 id="blog-search-heading" className="text-2xl font-bold tracking-tight md:text-3xl">{heading}</h2>
      <p className="mt-2 text-muted-foreground">Find articles on collaboration, music, film, sport and the creative business.</p>
      <div className="relative mt-5 max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label="Search blog articles"
          placeholder="Search by title or keyword, e.g. Afrobeats"
          className="pl-9"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {results.length === 0 ? (
        <p className="mt-6 text-muted-foreground">{posts.length ? "No articles match that search." : "Loading articles…"}</p>
      ) : (
        <ul className="mt-6 grid list-none gap-4 p-0 md:grid-cols-2">
          {results.map((p) => (
            <li key={p.id} className="rounded-xl border p-4 transition-colors hover:border-primary">
              <Link to={`/blog/${p.slug}`} className="block">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{p.category} · {formatBlogDate(p.published_at)}</p>
                <h3 className="mt-1 font-semibold">{p.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.excerpt}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link to="/blog/archive" className="mt-5 inline-block text-sm font-medium text-primary hover:underline">Browse the full archive →</Link>
    </section>
  );
}
