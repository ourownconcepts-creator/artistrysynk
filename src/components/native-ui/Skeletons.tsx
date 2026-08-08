import { cn } from "@/lib/utils";

export function Shimmer({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-surface-3", className)} />;
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3 rounded-3xl bg-surface-1 p-4 shadow-app-sm", className)}>
      <div className="flex items-center gap-3">
        <Shimmer className="h-11 w-11 rounded-full" />
        <div className="flex-1 space-y-2">
          <Shimmer className="h-3 w-1/2" />
          <Shimmer className="h-2.5 w-1/3" />
        </div>
      </div>
      <Shimmer className="h-32 w-full rounded-2xl" />
    </div>
  );
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl bg-surface-1 p-3 shadow-app-sm">
          <Shimmer className="h-11 w-11 rounded-full" />
          <div className="flex-1 space-y-2">
            <Shimmer className="h-3 w-2/5" />
            <Shimmer className="h-2.5 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonTiles({ tiles = 6 }: { tiles?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-hidden>
      {Array.from({ length: tiles }).map((_, i) => (
        <Shimmer key={i} className="aspect-square rounded-2xl" />
      ))}
    </div>
  );
}