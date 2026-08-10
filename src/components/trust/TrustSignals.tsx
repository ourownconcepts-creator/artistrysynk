import { BadgeCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/** Consistent verified checkmark used across Discover, search and profiles. */
export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <BadgeCheck
      aria-label="Verified creative"
      className={cn("h-4 w-4 shrink-0 text-emerald-500", className)}
    />
  );
}

const isRecent = (iso?: string | null) =>
  !!iso && Date.now() - new Date(iso).getTime() < 5 * 60 * 1000;

/**
 * Shared trust row: verified, featured and online-now signals rendered the
 * same way everywhere so users can compare creatives at a glance.
 */
export function TrustSignals({
  isVerified,
  isFeatured,
  lastSeenAt,
  className,
  tone = "default",
}: {
  isVerified?: boolean | null;
  isFeatured?: boolean | null;
  lastSeenAt?: string | null;
  className?: string;
  tone?: "default" | "onImage";
}) {
  const online = isRecent(lastSeenAt);
  if (!isVerified && !isFeatured && !online) return null;

  const chip =
    tone === "onImage"
      ? "border-white/20 bg-black/40 text-white backdrop-blur-sm"
      : "border-border bg-surface-2 text-muted-foreground";

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {isVerified ? (
        <span className={cn("flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium", chip)}>
          <VerifiedBadge className="h-3 w-3" />
          Verified
        </span>
      ) : null}
      {isFeatured ? (
        <span className={cn("flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium", chip)}>
          <Sparkles className="h-3 w-3 text-amber-400" aria-hidden="true" />
          Featured
        </span>
      ) : null}
      {online ? (
        <span className={cn("flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium", chip)}>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
          Online
        </span>
      ) : null}
    </div>
  );
}
