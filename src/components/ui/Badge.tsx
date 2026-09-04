import { cn } from "@/lib/utils";

// RCCF-70.4.2 (Workstream 6) — exported for presentation helpers to reuse the
// canonical badge variant vocabulary (no new badge system).
export type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "cyan" | "gold";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  className?: string;
}

// VISUAL-03A: badge hierarchy without excessive pills — default is md radius (8px),
// status variants use tokenized surfaces/borders; indigo (cyan) is restrained to info only
const VARIANT_CLASSES = {
  default: "bg-[var(--surface-hover)] text-[var(--text-secondary)] border border-[var(--border)]",
  success: "bg-[var(--color-success-surface)] text-[var(--color-success)] border border-[var(--color-success-border)]",
  warning: "bg-[var(--color-warning-surface)] text-[var(--color-warning)] border border-[var(--color-warning-border)]",
  danger: "bg-[var(--color-danger-surface)] text-[var(--color-danger)] border border-[var(--color-danger-border)]",
  info: "bg-[var(--color-info-surface)] text-[var(--color-info)] border border-[var(--color-info-border)]",
  cyan: "bg-[var(--color-info-surface)] text-[var(--color-info)] border border-[var(--color-info-border)]",
  gold: "bg-[var(--color-warning-surface)] text-[var(--color-warning)] border border-[var(--color-warning-border)]",
};

const SIZE_CLASSES = {
  sm: "px-1.5 py-0.5 text-[10px] tracking-wide",
  md: "px-2 py-0.5 text-xs",
};

export function Badge({ children, variant = "default", size = "md", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold",
        "rounded-[var(--radius-md)]",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className
      )}
    >
      {children}
    </span>
  );
}
