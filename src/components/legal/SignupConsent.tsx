import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "@/lib/router-compat";
import { MINIMUM_AGE } from "@/config/legal";

type Props = {
  acceptedTerms: boolean;
  confirmedAge: boolean;
  marketing: boolean;
  onAcceptedTermsChange: (value: boolean) => void;
  onConfirmedAgeChange: (value: boolean) => void;
  onMarketingChange: (value: boolean) => void;
  error?: string | undefined;
};

const legalLink = "text-primary hover:underline";

/**
 * Mandatory acceptance and the 18+ confirmation are separate from the optional
 * marketing consent, and nothing is pre-checked.
 */
export const SignupConsent = ({
  acceptedTerms,
  confirmedAge,
  marketing,
  onAcceptedTermsChange,
  onConfirmedAgeChange,
  onMarketingChange,
  error,
}: Props) => (
  <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
    <div className="flex items-start gap-3">
      <Checkbox
        id="consent-terms"
        checked={acceptedTerms}
        onCheckedChange={(v) => onAcceptedTermsChange(v === true)}
        aria-describedby="consent-terms-label"
        className="mt-0.5"
      />
      <label
        id="consent-terms-label"
        htmlFor="consent-terms"
        className="text-sm leading-relaxed cursor-pointer"
      >
        I agree to the{" "}
        <Link to="/terms" target="_blank" className={legalLink}>
          Terms of Service
        </Link>
        , acknowledge the{" "}
        <Link to="/privacy" target="_blank" className={legalLink}>
          Privacy Policy
        </Link>
        , and will follow the{" "}
        <Link to="/legal/community-guidelines" target="_blank" className={legalLink}>
          Community Guidelines
        </Link>
        .
      </label>
    </div>

    <div className="flex items-start gap-3">
      <Checkbox
        id="consent-age"
        checked={confirmedAge}
        onCheckedChange={(v) => onConfirmedAgeChange(v === true)}
        className="mt-0.5"
      />
      <label htmlFor="consent-age" className="text-sm leading-relaxed cursor-pointer">
        I confirm I am {MINIMUM_AGE} years of age or older.
      </label>
    </div>

    <div className="flex items-start gap-3">
      <Checkbox
        id="consent-marketing"
        checked={marketing}
        onCheckedChange={(v) => onMarketingChange(v === true)}
        className="mt-0.5"
      />
      <label htmlFor="consent-marketing" className="text-sm leading-relaxed cursor-pointer">
        <span className="text-muted-foreground">Optional —</span> send me product updates and
        opportunities by email. You can turn this off any time in Settings.
      </label>
    </div>

    {error && (
      <p role="alert" className="text-sm text-destructive">
        {error}
      </p>
    )}
  </div>
);
