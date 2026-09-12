import { supabase } from "@/integrations/supabase/client";

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  category: string;
  read_time: string;
  published_at: string;
}

// blog_posts is not yet in the generated Database types; cast through `any`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const postsTable = () => supabase.from("blog_posts" as any);

export async function fetchBlogPosts(): Promise<BlogPost[]> {
  const { data, error } = await postsTable()
    .select("id, slug, title, excerpt, author, category, read_time, published_at")
    .eq("published", true)
    .order("published_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as BlogPost[];
}

export async function fetchBlogPost(slug: string): Promise<BlogPost | null> {
  const { data, error } = await postsTable()
    .select("id, slug, title, excerpt, content, author, category, read_time, published_at")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as BlogPost) ?? null;
}

export function formatBlogDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
