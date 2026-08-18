import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BadgeCheck, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  fetchMyDocuments,
  fetchRequirements,
  removeDocument,
  uploadDocument,
  validateDocument,
  type VerificationDocument,
  type VerificationRequirement,
} from "@/lib/verification";
import { PROFESSIONAL_REQUEST_TYPE } from "@/lib/beauty";

interface Props {
  userId: string;
  professionalVerified?: boolean | null;
}

/**
 * Beauty role verification: upload certifications or practice licences, then
 * submit them for review. An approved review flips the profile's professional
 * badge on (handled by the database trigger).
 */
export const BeautyCredentialUpload = ({ userId, professionalVerified }: Props) => {
  const [requirements, setRequirements] = useState<VerificationRequirement[]>([]);
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);
  const [request, setRequest] = useState<{ status: string; created_at: string | null } | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    const [reqs, docs, { data: existing }] = await Promise.all([
      fetchRequirements("professional"),
      fetchMyDocuments(userId),
      supabase
        .from("verification_requests")
        .select("status, created_at")
        .eq("user_id", userId)
        .eq("request_type", PROFESSIONAL_REQUEST_TYPE)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    setRequirements(reqs);
    setDocuments(docs);
    setRequest((existing as { status: string; created_at: string | null } | null) ?? null);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const docFor = (docType: string) => documents.find((d) => d.doc_type === docType);

  const handleFile = async (requirement: VerificationRequirement, file: File) => {
    const problem = validateDocument(file, requirement);
    if (problem) {
      toast.error(problem);
      return;
    }
    setBusy(requirement.doc_type);
    const error = await uploadDocument(userId, requirement, file);
    setBusy(null);
    if (error) toast.error(error);
    else {
      toast.success(`${requirement.label} uploaded`);
      refresh();
    }
  };

  const handleRemove = async (doc: VerificationDocument) => {
    setBusy(doc.doc_type);
    const error = await removeDocument(doc);
    setBusy(null);
    if (error) toast.error(error);
    else refresh();
  };

  const submit = async () => {
    const missing = requirements.filter((r) => r.is_required && !docFor(r.doc_type));
    if (missing.length > 0) {
      toast.error(`Still needed: ${missing.map((m) => m.label).join(", ")}`);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("verification_requests").insert({
      user_id: userId,
      request_type: PROFESSIONAL_REQUEST_TYPE,
      verification_data: { notes: notes.trim() || null, docs: documents.map((d) => d.doc_type) },
    });
    setSubmitting(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Credentials submitted for review");
      setNotes("");
      refresh();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BadgeCheck className="h-5 w-5 text-emerald-500" />
          Professional credentials
        </CardTitle>
        <CardDescription>
          Upload your beauty certification or practice licence to earn the professionally verified badge on your
          profile. Documents are stored privately and only reviewers can open them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {professionalVerified ? (
          <Badge className="gap-1">
            <BadgeCheck className="h-3.5 w-3.5" />
            Professionally verified
          </Badge>
        ) : request ? (
          <Badge variant="secondary">Review status: {request.status}</Badge>
        ) : null}

        {requirements.length === 0 && (
          <p className="text-sm text-muted-foreground">Credential checks aren't open yet — check back soon.</p>
        )}

        {requirements.map((requirement) => {
          const doc = docFor(requirement.doc_type);
          const inputId = `credential-${requirement.doc_type}`;
          return (
            <div key={requirement.id} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {requirement.label}
                    {requirement.is_required && <span className="text-destructive"> *</span>}
                  </p>
                  {requirement.description && (
                    <p className="mt-1 text-xs text-muted-foreground">{requirement.description}</p>
                  )}
                </div>
                {busy === requirement.doc_type && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>

              {doc ? (
                <div className="mt-3 flex items-center justify-between gap-2 rounded-md bg-muted/50 p-2">
                  <span className="flex min-w-0 items-center gap-2 text-xs">
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="truncate">{doc.file_name ?? doc.doc_type}</span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${requirement.label}`}
                    onClick={() => handleRemove(doc)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="mt-3">
                  <input
                    id={inputId}
                    type="file"
                    className="hidden"
                    accept={requirement.accepted_mime.join(",")}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFile(requirement, file);
                      e.target.value = "";
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" asChild>
                    <label htmlFor={inputId} className="cursor-pointer">
                      <Upload className="mr-2 h-4 w-4" />
                      Upload ({requirement.max_size_mb}MB max)
                    </label>
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        {requirements.length > 0 && (
          <>
            <div className="space-y-2">
              <Label htmlFor="credential-notes">Anything reviewers should know?</Label>
              <Textarea
                id="credential-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Academy name, licence number, years in practice…"
              />
            </div>
            <Button type="button" onClick={submit} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit for review
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};