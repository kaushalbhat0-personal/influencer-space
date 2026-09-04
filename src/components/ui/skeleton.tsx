// MIT — derived from shadcn/ui skeleton (https://ui.shadcn.com/docs/components/skeleton)
// Hardened: non-interactive (aria-hidden), no misleading announcements,
// data-slot, respects prefers-reduced-motion via globals.css.
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      data-slot="skeleton"
      className={cn(
        "animate-pulse rounded-md bg-[var(--surface-card)] motion-reduce:animate-none pointer-events-none select-none",
        className
      )}
      {...props}
    />
  );
}
