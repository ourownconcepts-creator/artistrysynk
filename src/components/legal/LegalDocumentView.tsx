import ReactMarkdown from "react-markdown";
import { Link } from "@/lib/router-compat";
import { Badge } from "@/components/ui/badge";
import { resolveLegalTokens } from "@/config/legal";
import type { LegalDocumentDetail } from "@/lib/legal.functions";
import { History } from "lucide-react";

export const LegalDocumentView = ({ doc }: { doc: LegalDocumentDetail }) => {
  const content = resolveLegalTokens(doc.content);
  const older = doc.versions.filter((v) => v.version !== doc.version);

  return (
    <main className="container mx-auto max-w-3xl px-4 py-10 md:py-16">
      <header className="mb-8 space-y-3">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{doc.title}</h1>
        {doc.summary && <p className="text-muted-foreground">{doc.summary}</p>}
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">Version {doc.version}</Badge>
          <span>
            Effective{" "}
            {new Date(doc.effectiveDate).toLocaleDateString(undefined, {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          {!doc.isLatest && <Badge variant="outline">Historical version</Badge>}
        </div>
      </header>

      <article
        className="prose prose-neutral dark:prose-invert max-w-none
          prose-headings:tracking-tight prose-a:text-primary
          prose-table:text-sm prose-th:text-left"
      >
        <ReactMarkdown>{content}</ReactMarkdown>
      </article>

      {older.length > 0 && (
        <section className="mt-12 border-t border-border pt-6" aria-labelledby="version-history">
          <h2 id="version-history" className="flex items-center gap-2 text-sm font-semibold mb-3">
            <History className="w-4 h-4" aria-hidden="true" />
            Previous versions
          </h2>
          <ul className="flex flex-wrap gap-3 text-sm">
            {older.map((v) => (
              <li key={v.version}>
                <Link
                  to={`/legal/${doc.slug}?v=${v.version}`}
                  className="text-primary hover:underline"
                >
                  Version {v.version} ({new Date(v.effectiveDate).toLocaleDateString()})
                </Link>
              </li>
            ))}
            {!doc.isLatest && (
              <li>
                <Link to={`/legal/${doc.slug}`} className="text-primary hover:underline">
                  View current version
                </Link>
              </li>
            )}
          </ul>
        </section>
      )}

      <p className="mt-10 text-sm text-muted-foreground">
        <Link to="/legal" className="text-primary hover:underline">
          All ArtistrySynk policies
        </Link>
      </p>
    </main>
  );
};
