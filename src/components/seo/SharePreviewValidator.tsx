import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";
import { auditSharePreviews } from "@/lib/seo-audit.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type AuditResponse = Awaited<ReturnType<typeof auditSharePreviews>>;

export function SharePreviewValidator() {
  const runAudit = useServerFn(auditSharePreviews);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AuditResponse | null>(null);

  const run = async () => {
    setLoading(true);
    try {
      const result = await runAudit({ data: {} });
      setReport(result);
      if (result.errorCount === 0 && result.warningCount === 0) {
        toast.success("All share previews look good");
      } else {
        toast.message(`${result.errorCount} errors, ${result.warningCount} warnings`);
      }
    } catch (err) {
      toast.error((err as Error).message || "Share preview check failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-lg">Share preview check</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Fetches the most important public pages and flags missing og:image, wrong dimensions or
            incomplete Twitter tags. Pages whose own image is missing or too small automatically fall
            back to the branded 1200x630 share banner.
          </p>
        </div>
        <Button onClick={run} disabled={loading} size="sm">
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Run check
        </Button>
      </CardHeader>
      {report ? (
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant={report.errorCount ? "destructive" : "secondary"}>
              {report.errorCount} errors
            </Badge>
            <Badge variant="outline">{report.warningCount} warnings</Badge>
            <span className="text-muted-foreground">
              {report.baseUrl} · {new Date(report.checkedAt).toLocaleString()}
            </span>
          </div>
          <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
            {report.results.map((r) => {
              const errors = r.issues.filter((i) => i.level === "error");
              const warnings = r.issues.filter((i) => i.level === "warning");
              return (
                <li key={r.path} className="p-3">
                  <div className="flex items-center gap-2">
                    {errors.length ? (
                      <XCircle className="h-4 w-4 text-destructive" />
                    ) : warnings.length ? (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    )}
                    <span className="font-mono text-sm">{r.path}</span>
                    {r.ogImageFallback ? (
                      <Badge variant="outline" className="text-xs">
                        fallback image
                      </Badge>
                    ) : null}
                    {r.ogImageWidth && r.ogImageHeight ? (
                      <span className="text-xs text-muted-foreground">
                        og:image {r.ogImageWidth}×{r.ogImageHeight}
                      </span>
                    ) : null}
                  </div>
                  {r.issues.length ? (
                    <ul className="mt-2 space-y-1 pl-6 text-sm">
                      {r.issues.map((i, idx) => (
                        <li
                          key={idx}
                          className={
                            i.level === "error" ? "text-destructive" : "text-muted-foreground"
                          }
                        >
                          {i.message}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </CardContent>
      ) : null}
    </Card>
  );
}