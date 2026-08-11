import { useState, type ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BadgeCheck, Loader2, ShieldAlert } from "lucide-react";
import { useNavigate } from "@/lib/router-compat";
import {
  CAPABILITY_LABELS,
  LEVEL_LABELS,
  requestCapabilityVerification,
  useCapability,
  type Capability,
} from "@/lib/capabilities";

/**
 * Wraps any gated capability. Children render only when the database says the
 * member meets the capability's verification requirement; otherwise we show a
 * prompt that triggers an identity verification review.
 */
export const VerificationGate = ({
  capability,
  children,
  description,
}: {
  capability: Capability;
  children: ReactNode;
  description?: string;
}) => {
  const navigate = useNavigate();
  const { loading, allowed, requiredLevel, myLevel, refresh } = useCapability(capability);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden="true" />
      </div>
    );
  }

  if (allowed) return <>{children}</>;

  const submit = async () => {
    setSubmitting(true);
    const error = await requestCapabilityVerification(capability);
    setSubmitting(false);
    if (error) {
      toast.error("Could not start verification. Please try again.");
      return;
    }
    toast.success("Verification started — upload your documents to finish.");
    void refresh();
    navigate("/verification");
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" aria-hidden="true" />
            Verification required
          </CardTitle>
          <CardDescription>
            {description ??
              `${CAPABILITY_LABELS[capability] ?? capability} needs a verified identity before you can continue.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="secondary" className="gap-1">
              <BadgeCheck className="h-3 w-3" /> Required: {LEVEL_LABELS[requiredLevel] ?? requiredLevel}
            </Badge>
            <Badge variant="outline">Your level: {LEVEL_LABELS[myLevel] ?? myLevel}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Upload the documents on your verification checklist and we'll review them within 2
            business days. Your legal details are never shown to other members and every staff
            access is logged.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void submit()} disabled={submitting}>
              {submitting ? "Starting…" : "Start verification"}
            </Button>
            <Button variant="outline" onClick={() => navigate("/verification")}>
              View checklist & status
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};