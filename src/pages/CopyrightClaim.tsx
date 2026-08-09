import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitCopyrightClaim, lookupCopyrightClaim } from "@/lib/copyright.functions";
import { Footer } from "@/components/Footer";
import { PageSEO } from "@/components/seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, ShieldAlert, Search, CheckCircle2 } from "lucide-react";
import { LEGAL_CONFIG } from "@/config/legal";

const CONTENT_TYPES = [
  { value: "portfolio_item", label: "Portfolio media (audio, video, image)" },
  { value: "project_file", label: "File in a project room" },
  { value: "profile", label: "A profile or its text" },
  { value: "message", label: "A message" },
  { value: "other", label: "Something else" },
];

const STATUS_COPY: Record<string, string> = {
  received: "Received — awaiting review",
  reviewing: "Under review by Trust & Safety",
  actioned: "Actioned — content removed or restricted",
  rejected: "Closed — notice did not meet our requirements",
  counter_noticed: "Counter-notice received — under further review",
  withdrawn: "Withdrawn by the claimant",
};

const CopyrightClaim = () => {
  const submit = useServerFn(submitCopyrightClaim);
  const lookup = useServerFn(lookupCopyrightClaim);

  const [form, setForm] = useState({
    rightsHolderName: "",
    contactEmail: "",
    contactPhone: "",
    contentType: "portfolio_item",
    contentUrl: "",
    workDescription: "",
    infringementExplanation: "",
    evidenceUrls: "",
  });
  const [declared, setDeclared] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  const [lookupRef, setLookupRef] = useState("");
  const [lookupResult, setLookupResult] = useState<
    { referenceId: string; status: string; outcome: string | null } | "none" | null
  >(null);
  const [looking, setLooking] = useState(false);

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const send = async () => {
    if (!declared) {
      toast.error("Please confirm the declaration before submitting.");
      return;
    }
    setBusy(true);
    try {
      const evidence = form.evidenceUrls
        .split(/[\s,]+/)
        .map((u) => u.trim())
        .filter(Boolean)
        .slice(0, 5);

      const result = await submit({
        data: {
          rightsHolderName: form.rightsHolderName.trim(),
          contactEmail: form.contactEmail.trim(),
          ...(form.contactPhone.trim() ? { contactPhone: form.contactPhone.trim() } : {}),
          contentType: form.contentType as never,
          contentUrl: form.contentUrl.trim(),
          workDescription: form.workDescription.trim(),
          infringementExplanation: form.infringementExplanation.trim(),
          ...(evidence.length ? { evidenceUrls: evidence } : {}),
          declarationAccepted: true,
        },
      });
      setReference(result.referenceId);
      toast.success(`Notice filed — reference ${result.referenceId}`);
    } catch (err) {
      toast.error(
        err instanceof Error && err.message.length < 160
          ? err.message
          : "Please check the form: every field except phone and evidence is required.",
      );
    } finally {
      setBusy(false);
    }
  };

  const runLookup = async () => {
    setLooking(true);
    try {
      const res = await lookup({ data: { referenceId: lookupRef.trim() } });
      setLookupResult(res ?? "none");
    } catch {
      setLookupResult("none");
    } finally {
      setLooking(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageSEO
        title="Report copyright infringement | ArtistrySynk"
        description="File a copyright takedown notice for content hosted on ArtistrySynk, or track the status of a notice you already submitted."
        canonicalPath="/copyright/report"
      />

      <main className="container mx-auto px-4 py-12 max-w-3xl space-y-8">
        <header className="space-y-3">
          <Badge variant="outline" className="gap-1">
            <ShieldAlert className="w-3 h-3" aria-hidden="true" />
            Trust &amp; Safety
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold">Report copyright infringement</h1>
          <p className="text-muted-foreground">
            If your work has been posted on ArtistrySynk without permission, file a notice below. We
            review every complete notice, remove or restrict infringing content, and tell the
            uploader so they can respond with a counter-notice. Repeat infringers lose their account.
          </p>
        </header>

        {reference ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" aria-hidden="true" />
                Notice filed
              </CardTitle>
              <CardDescription>
                Keep this reference — you will need it for any follow-up.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="font-mono text-lg">{reference}</p>
              <p className="text-sm text-muted-foreground">
                A confirmation has been emailed to {form.contactEmail}. Questions?{" "}
                {LEGAL_CONFIG.COPYRIGHT_EMAIL}
              </p>
              <Button variant="outline" onClick={() => setReference(null)} className="min-h-11">
                File another notice
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Takedown notice</CardTitle>
              <CardDescription>
                Knowingly false notices can expose you to liability, so please only report content
                you own or are authorised to act for.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cc-name">Rights holder name *</Label>
                  <Input
                    id="cc-name"
                    value={form.rightsHolderName}
                    onChange={(e) => set("rightsHolderName")(e.target.value)}
                    placeholder="You, or the company you represent"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cc-email">Contact email *</Label>
                  <Input
                    id="cc-email"
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) => set("contactEmail")(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cc-phone">Contact phone (optional)</Label>
                  <Input
                    id="cc-phone"
                    value={form.contactPhone}
                    onChange={(e) => set("contactPhone")(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cc-type">What kind of content? *</Label>
                  <Select value={form.contentType} onValueChange={set("contentType")}>
                    <SelectTrigger id="cc-type" className="min-h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTENT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cc-url">Link to the infringing content *</Label>
                <Input
                  id="cc-url"
                  value={form.contentUrl}
                  onChange={(e) => set("contentUrl")(e.target.value)}
                  placeholder="https://artistrysynk.app/profile/…"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cc-work">Describe your original work *</Label>
                <Textarea
                  id="cc-work"
                  rows={3}
                  value={form.workDescription}
                  onChange={(e) => set("workDescription")(e.target.value)}
                  placeholder="Title, release date, where it was first published, registration if any."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cc-why">Why is this content infringing? *</Label>
                <Textarea
                  id="cc-why"
                  rows={3}
                  value={form.infringementExplanation}
                  onChange={(e) => set("infringementExplanation")(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cc-evidence">Evidence links (optional, up to 5)</Label>
                <Textarea
                  id="cc-evidence"
                  rows={2}
                  value={form.evidenceUrls}
                  onChange={(e) => set("evidenceUrls")(e.target.value)}
                  placeholder="Links to the original release, registration certificate, screenshots…"
                />
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                <Checkbox
                  id="cc-declaration"
                  checked={declared}
                  onCheckedChange={(v) => setDeclared(v === true)}
                  aria-describedby="cc-declaration-text"
                />
                <Label
                  id="cc-declaration-text"
                  htmlFor="cc-declaration"
                  className="text-sm font-normal leading-relaxed"
                >
                  I declare in good faith that the use of the material is not authorised by the
                  rights holder, and that the information in this notice is accurate. I am the rights
                  holder or authorised to act on their behalf.
                </Label>
              </div>

              <Button onClick={() => void send()} disabled={busy} className="gap-2 min-h-11">
                {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                {busy ? "Filing notice…" : "File takedown notice"}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" aria-hidden="true" />
              Track a notice
            </CardTitle>
            <CardDescription>Enter the AS-CPY reference we emailed you.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Input
                value={lookupRef}
                onChange={(e) => setLookupRef(e.target.value.toUpperCase())}
                placeholder="AS-CPY-XXXXX"
                aria-label="Copyright notice reference"
                className="max-w-xs"
              />
              <Button
                variant="outline"
                onClick={() => void runLookup()}
                disabled={looking || lookupRef.trim().length < 6}
                className="min-h-11"
              >
                {looking ? "Checking…" : "Check status"}
              </Button>
            </div>
            {lookupResult === "none" && (
              <p className="text-sm text-muted-foreground">
                We could not find a notice with that reference.
              </p>
            )}
            {lookupResult && lookupResult !== "none" && (
              <div className="rounded-lg border border-border p-3 text-sm space-y-1">
                <p className="font-mono text-xs">{lookupResult.referenceId}</p>
                <p>{STATUS_COPY[lookupResult.status] ?? lookupResult.status}</p>
                {lookupResult.outcome && (
                  <p className="text-muted-foreground">{lookupResult.outcome}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default CopyrightClaim;
