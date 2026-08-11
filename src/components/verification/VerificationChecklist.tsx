import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Eye,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import { CAPABILITY_LABELS, LEVEL_LABELS, type Capability } from "@/lib/capabilities";
import {
  fetchMyDocuments,
  fetchRequirements,
  previewDocument,
  removeDocument,
  submitVerification,
  uploadDocument,
  validateDocument,
  type VerificationDocument,
  type VerificationRequirement,
} from "@/lib/verification";

/**
 * Guided, step-by-step document checklist. Every file is validated before it
 * leaves the browser, and submission is blocked until each required item is
 * attached — the same rule the database enforces.
 */
export const VerificationChecklist = ({
  capability,
  level,
  onSubmitted,
}: {
  capability: Capability;
  level: string;
  onSubmitted?: () => void;
}) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<VerificationRequirement[]>([]);
  const [docs, setDocs] = useState<VerificationDocument[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [missing, setMissing] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const id = auth.user?.id ?? null;
    setUserId(id);
    const [reqs, mine] = await Promise.all([
      fetchRequirements(level),
      id ? fetchMyDocuments(id) : Promise.resolve([]),
    ]);
    setRequirements(reqs);
    setDocs(mine);
    setLoading(false);
  }, [level]);

  useEffect(() => {
    void load();
  }, [load]);

  const docFor = (docType: string) => docs.find((d) => d.doc_type === docType);
  const required = requirements.filter((r) => r.is_required);
  const done = required.filter((r) => docFor(r.doc_type)).length;
  const progress = required.length === 0 ? 100 : Math.round((done / required.length) * 100);

  const pick = async (requirement: VerificationRequirement, file: File | undefined) => {
    if (!file || !userId) return;
    const message = validateDocument(file, requirement);
    if (message) {
      setErrors((e) => ({ ...e, [requirement.doc_type]: message }));
      return;
    }
    setErrors((e) => {
      const next = { ...e };
      delete next[requirement.doc_type];
      return next;
    });
    setBusy(requirement.doc_type);
    const uploadError = await uploadDocument(userId, requirement, file);
    setBusy(null);
    if (uploadError) {
      setErrors((e) => ({ ...e, [requirement.doc_type]: uploadError }));
      return;
    }
    setMissing([]);
    toast.success(`${requirement.label} attached.`);
    void load();
  };

  const drop = async (doc: VerificationDocument) => {
    setBusy(doc.doc_type);
    const error = await removeDocument(doc);
    setBusy(null);
    if (error) toast.error("Could not remove that file.");
    else void load();
  };

  const view = async (doc: VerificationDocument) => {
    const url = await previewDocument(doc);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    else toast.error("Could not open that file.");
  };

  const submit = async () => {
    const blocked = required.filter((r) => !docFor(r.doc_type)).map((r) => r.label);
    if (blocked.length > 0) {
      setMissing(blocked);
      return;
    }
    setSubmitting(true);
    const result = await submitVerification(capability, notes.trim() || undefined);
    setSubmitting(false);
    if (!result.ok) {
      setMissing(result.missing ?? []);
      if (result.error) toast.error(result.error);
      return;
    }
    setMissing([]);
    setNotes("");
    toast.success("Submitted — we'll review it within 2 business days.");
    onSubmitted?.();
    void load();
  };

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verification checklist</CardTitle>
        <CardDescription>
          For {CAPABILITY_LABELS[capability] ?? capability} you need{" "}
          {LEVEL_LABELS[level] ?? level}. Files are stored privately and only identity officers can
          open them — every access is logged.
        </CardDescription>
        <div className="pt-2">
          <Progress value={progress} aria-label="Checklist progress" />
          <p className="mt-1 text-xs text-muted-foreground">
            {done} of {required.length} required documents attached
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {missing.length > 0 ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Almost there</AlertTitle>
            <AlertDescription>
              Attach these before submitting: {missing.join(", ")}.
            </AlertDescription>
          </Alert>
        ) : null}

        <ol className="space-y-3">
          {requirements.map((r, index) => {
            const doc = docFor(r.doc_type);
            const error = errors[r.doc_type];
            return (
              <li key={r.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <span className="mt-0.5">
                    {doc ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      Step {index + 1}: {r.label}{" "}
                      {r.is_required ? null : (
                        <Badge variant="outline" className="ml-1 text-[10px]">
                          Optional
                        </Badge>
                      )}
                    </p>
                    {r.description ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">{r.description}</p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Up to {r.max_size_mb}MB ·{" "}
                      {(r.accepted_mime ?? [])
                        .map((m) => m.split("/")[1]?.toUpperCase() ?? m)
                        .join(", ")}
                    </p>
                    {doc ? (
                      <p className="mt-2 truncate text-xs">
                        Attached: {doc.file_name ?? doc.doc_type}
                        {doc.review_note ? (
                          <span className="text-destructive"> — {doc.review_note}</span>
                        ) : null}
                      </p>
                    ) : null}
                    {error ? (
                      <p role="alert" className="mt-2 text-xs font-medium text-destructive">
                        {error}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex gap-2">
                    <input
                      ref={(el) => {
                        inputs.current[r.doc_type] = el;
                      }}
                      type="file"
                      className="hidden"
                      accept={(r.accepted_mime ?? []).join(",")}
                      onChange={(e) => void pick(r, e.target.files?.[0])}
                    />
                    <Button
                      size="sm"
                      variant={doc ? "outline" : "default"}
                      disabled={busy === r.doc_type}
                      onClick={() => inputs.current[r.doc_type]?.click()}
                      className="gap-1"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {busy === r.doc_type ? "Uploading…" : doc ? "Replace" : "Upload"}
                    </Button>
                    {doc ? (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => void view(doc)} aria-label="Preview file">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => void drop(doc)} aria-label="Remove file">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="space-y-2">
          <label htmlFor="verification-notes" className="text-sm font-medium">
            Anything we should know? (optional)
          </label>
          <Textarea
            id="verification-notes"
            value={notes}
            maxLength={500}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. my ID shows my maiden name"
          />
        </div>

        <Button onClick={() => void submit()} disabled={submitting} className="w-full">
          {submitting ? "Submitting…" : "Submit for review"}
        </Button>
      </CardContent>
    </Card>
  );
};