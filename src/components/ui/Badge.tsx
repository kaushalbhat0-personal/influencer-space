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

const VARIANT_CLASSES = {
  default: "bg-[var(--surface-hover)] text-[var(--text-secondary)] border border-[var(--border)]",
  success: "bg-green-500/20 text-green-400",
  warning: "bg-amber-500/20 text-amber-400",
  danger: "bg-red-500/20 text-red-400",
  info: "bg-blue-500/20 text-blue-400",
  cyan: "bg-s8ul-cyan/20 text-s8ul-cyan",
  gold: "bg-amber-500/20 text-amber-400",
};

const SIZE_CLASSES = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-0.5 text-xs",
};

export function Badge({ children, variant = "default", size = "md", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className
      )}
    >
      {children}
    </span>
  );
}
