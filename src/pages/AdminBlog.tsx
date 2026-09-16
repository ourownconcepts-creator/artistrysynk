import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Eye, FileText, Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { PageSEO } from "@/components/seo";
import { formatBlogDate } from "@/lib/blog";

interface AdminPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  category: string;
  read_time: string;
  published: boolean;
  published_at: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = () => supabase.from("blog_posts" as any);

const emptyDraft = {
  id: "",
  slug: "",
  title: "",
  excerpt: "",
  content: "",
  author: "ArtistrySynk Team",
  category: "Guides",
  read_time: "",
  published: false,
  published_at: null as string | null,
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const estimateReadTime = (content: string) => {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
};

const AdminBlog = () => {
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<AdminPost>({ ...emptyDraft });
  const [slugLocked, setSlugLocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await table()
      .select("id, slug, title, excerpt, content, author, category, read_time, published, published_at")
      .order("published_at", { ascending: false, nullsFirst: true });
    setLoading(false);
    if (error) {
      toast.error(error.message || "Could not load articles");
      return;
    }
    setPosts((data ?? []) as unknown as AdminPost[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const isEditing = Boolean(draft.id);

  const categories = useMemo(
    () => Array.from(new Set(posts.map((p) => p.category).filter(Boolean))).sort(),
    [posts]
  );

  const reset = () => {
    setDraft({ ...emptyDraft });
    setSlugLocked(false);
    setPreview(false);
  };

  const editPost = (post: AdminPost) => {
    setDraft(post);
    setSlugLocked(true);
    setPreview(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onTitleChange = (title: string) => {
    setDraft((d) => ({ ...d, title, slug: slugLocked ? d.slug : slugify(title) }));
  };

  const save = async () => {
    const title = draft.title.trim();
    const slug = slugify(draft.slug || title);
    const content = draft.content.trim();
    if (!title || !slug || !content) {
      toast.error("Title, web address and article text are required");
      return;
    }
    const payload = {
      slug,
      title,
      excerpt: draft.excerpt.trim() || content.slice(0, 180),
      content,
      author: draft.author.trim() || "ArtistrySynk Team",
      category: draft.category.trim() || "Guides",
      read_time: draft.read_time.trim() || estimateReadTime(content),
      published: draft.published,
      // Never send null: the column is NOT NULL. Drafts keep a timestamp too;
      // only `published` controls whether the article is live.
      published_at: draft.published_at ?? new Date().toISOString(),
    };

    setSaving(true);
    const { error } = isEditing
      ? await table().update(payload).eq("id", draft.id)
      : await table().insert(payload);
    setSaving(false);

    if (error) {
      toast.error(
        error.message?.includes("duplicate")
          ? "Another article already uses that web address"
          : error.message || "Could not save the article"
      );
      return;
    }
    toast.success(isEditing ? "Article updated" : draft.published ? "Article published" : "Draft saved");
    reset();
    await load();
  };

  const togglePublished = async (post: AdminPost) => {
    const next = !post.published;
    const { error } = await table()
      .update({
        published: next,
        published_at: next ? post.published_at ?? new Date().toISOString() : post.published_at,
      })
      .eq("id", post.id);
    if (error) {
      toast.error(error.message || "Could not update the article");
      return;
    }
    toast.success(next ? "Article is now live" : "Article unpublished");
    await load();
  };

  const remove = async (post: AdminPost) => {
    if (!window.confirm(`Delete “${post.title}”? This cannot be undone.`)) return;
    const { error } = await table().delete().eq("id", post.id);
    if (error) {
      toast.error(error.message || "Could not delete the article");
      return;
    }
    toast.success("Article deleted");
    if (draft.id === post.id) reset();
    await load();
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      <PageSEO title="Blog Editor | ArtistrySynk Admin" description="Write, publish and manage ArtistrySynk blog articles." noIndex />

      <header className="mb-8">
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <FileText className="h-7 w-7 text-primary" />
          Blog editor
        </h1>
        <p className="text-muted-foreground mt-1">
          Write a new article, save it as a draft, and publish when it is ready.
        </p>
      </header>

      <Card className="mb-10">
        <CardHeader>
          <CardTitle>{isEditing ? "Edit article" : "New article"}</CardTitle>
          <CardDescription>
            Published articles appear on the blog, in category filters and in the sitemap automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={draft.title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="How to build a standout creative portfolio"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Web address</Label>
              <Input
                id="slug"
                value={draft.slug}
                onChange={(e) => {
                  setSlugLocked(true);
                  setDraft((d) => ({ ...d, slug: e.target.value }));
                }}
                placeholder="standout-creative-portfolio"
              />
              <p className="text-xs text-muted-foreground">/blog/{slugify(draft.slug || draft.title) || "…"}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={draft.category}
                onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                list="blog-categories"
                placeholder="Guides"
              />
              <datalist id="blog-categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="author">Author</Label>
              <Input
                id="author"
                value={draft.author}
                onChange={(e) => setDraft((d) => ({ ...d, author: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="read">Read time</Label>
              <Input
                id="read"
                value={draft.read_time}
                onChange={(e) => setDraft((d) => ({ ...d, read_time: e.target.value }))}
                placeholder={draft.content ? estimateReadTime(draft.content) : "5 min read"}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="excerpt">Short summary</Label>
              <Textarea
                id="excerpt"
                rows={2}
                value={draft.excerpt}
                onChange={(e) => setDraft((d) => ({ ...d, excerpt: e.target.value }))}
                placeholder="One or two sentences shown on the blog list and in search results."
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="content">Article</Label>
              <Textarea
                id="content"
                rows={16}
                value={draft.content}
                onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
                placeholder={"Write your article here.\n\nLeave a blank line between paragraphs.\n\n## Section heading"}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Blank lines start new paragraphs. Start a line with ## for a section heading.
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Switch
                id="published"
                checked={draft.published}
                onCheckedChange={(published) => setDraft((d) => ({ ...d, published }))}
              />
              <Label htmlFor="published" className="cursor-pointer">
                {draft.published ? "Publish live" : "Save as draft"}
              </Label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setPreview((p) => !p)} disabled={!draft.content}>
                <Eye className="mr-2 h-4 w-4" />
                {preview ? "Hide preview" : "Preview"}
              </Button>
              {isEditing && (
                <Button variant="ghost" onClick={reset}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              )}
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isEditing ? "Save changes" : draft.published ? "Publish" : "Save draft"}
              </Button>
            </div>
          </div>

          {preview && (
            <div className="rounded-lg border bg-muted/30 p-6">
              <h2 className="text-2xl font-bold">{draft.title || "Untitled"}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {draft.author} · {draft.read_time || estimateReadTime(draft.content)} · {draft.category}
              </p>
              <div className="prose prose-sm dark:prose-invert mt-4 max-w-none">
                {draft.content.split(/\n{2,}/).map((block, i) =>
                  block.startsWith("## ") ? (
                    <h3 key={i} className="mt-4 text-lg font-semibold">
                      {block.replace(/^##\s+/, "")}
                    </h3>
                  ) : (
                    <p key={i} className="mt-3 leading-relaxed">
                      {block}
                    </p>
                  )
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>All articles</CardTitle>
            <CardDescription>{posts.length} article{posts.length === 1 ? "" : "s"}</CardDescription>
          </div>
          <Button variant="outline" onClick={reset}>
            <Plus className="mr-2 h-4 w-4" />
            New
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 py-6 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading articles…
            </div>
          ) : posts.length === 0 ? (
            <p className="py-6 text-muted-foreground">No articles yet. Write your first one above.</p>
          ) : (
            posts.map((post) => (
              <div
                key={post.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{post.title}</p>
                    <Badge variant={post.published ? "default" : "secondary"}>
                      {post.published ? "Live" : "Draft"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    /blog/{post.slug} · {post.category}
                    {post.published_at ? ` · ${formatBlogDate(post.published_at)}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => togglePublished(post)}>
                    {post.published ? "Unpublish" : "Publish"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => editPost(post)}>
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(post)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminBlog;
