import { cn } from "@/lib/utils";

type StatBlockProps = {
  label: string;
  value: string | number;
  className?: string;
  onClick?: () => void;
};

export function StatBlock({ label, value, className, onClick }: StatBlockProps) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={cn("min-w-0 text-center", onClick && "cursor-pointer", className)}
    >
      <div className="text-base font-bold tabular-nums">{value}</div>
      <div className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </Comp>
  );
}