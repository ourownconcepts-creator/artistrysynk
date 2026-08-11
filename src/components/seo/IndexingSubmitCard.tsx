import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Send } from "lucide-react";
import { resubmitSitemapForIndexing } from "@/lib/seo-indexing.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

type Submission = Awaited<ReturnType<typeof resubmitSitemapForIndexing>>;

export function IndexingSubmitCard() {
  const resubmit = useServerFn(resubmitSitemapForIndexing);
  const [loading, setLoading] = useState(false);
  const [last, setLast] = useState<Submission | null>(null);

  const run = async () => {
    setLoading(true);
    try {
      const result = await resubmit({ data: undefined });
      setLast(result);
      toast.success(`${result.submitted} URLs submitted for indexing`);
    } catch (err) {
      toast.error((err as Error).message || "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-lg">Submit pages for indexing</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Sitemaps are generated live, so new blog posts, city pages and studios appear at
            /sitemap.xml immediately. Use this to also notify search engines right away.
          </p>
        </div>
        <Button onClick={run} disabled={loading} size="sm" variant="secondary">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Submit now
        </Button>
      </CardHeader>
      {last ? (
        <CardContent className="space-y-1 text-sm">
          <p className="text-muted-foreground">
            {last.submitted} URLs · {new Date(last.submittedAt).toLocaleString()}
          </p>
          <ul className="space-y-1">
            {last.results.map((r) => (
              <li key={r.endpoint} className={r.ok ? "text-emerald-600" : "text-destructive"}>
                {new URL(r.endpoint).host} — {r.ok ? "accepted" : `failed${r.status ? ` (${r.status})` : ""}`}
              </li>
            ))}
          </ul>
        </CardContent>
      ) : null}
    </Card>
  );
}