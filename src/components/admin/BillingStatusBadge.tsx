import { cn } from "@/lib/utils";

const STATUS_MAP: Record<string, string> = {
  ACTIVE: "bg-emerald-500/15 text-emerald-400",
  PAID: "bg-emerald-500/15 text-emerald-400",
  SUCCEEDED: "bg-emerald-500/15 text-emerald-400",
  COMPLETED: "bg-emerald-500/15 text-emerald-400",
  PENDING: "bg-amber-500/15 text-amber-400",
  TRIALING: "bg-[var(--brand-primary)]/15 text-[var(--brand-primary)]",
  PAST_DUE: "bg-red-500/15 text-red-400",
  FAILED: "bg-red-500/15 text-red-400",
  // RCCF-BILLING-07B — EXPIRED distinct from CANCELLED: expired = storefront 404 (system), cancelled = user-initiated.
  CANCELLED: "bg-zinc-800 text-[var(--text-secondary)] border border-white/10",
  EXPIRED: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
  REFUNDED: "bg-violet-500/15 text-violet-400",
  DRAFT: "bg-zinc-800 text-[var(--text-secondary)]",
  FREE: "bg-zinc-800 text-[var(--text-secondary)]",
};

interface Props { status: string; className?: string; }

export function BillingStatusBadge({ status, className }: Props) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", STATUS_MAP[status] ?? "bg-zinc-800 text-[var(--text-secondary)]", className)}>
      {status}
    </span>
  );
}
