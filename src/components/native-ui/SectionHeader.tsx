import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  to?: string;
  className?: string;
};

export function SectionHeader({ title, subtitle, action, to, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-end justify-between gap-3 px-1", className)}>
      <div className="min-w-0">
        <h2 className="truncate text-[15px] font-semibold tracking-tight">{title}</h2>
        {subtitle ? (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {action ??
        (to ? (
          <Link
            to={to}
            className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-primary"
          >
            See all
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        ) : null)}
    </div>
  );
}