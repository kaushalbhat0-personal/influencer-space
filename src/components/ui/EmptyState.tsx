import type { LucideIcon } from "lucide-react";
import { PackageOpen, SearchX } from "lucide-react";

type EmptyVariant = "contextual" | "secondary";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** Optional illustration node for contextual (first-run) states */
  illustration?: React.ReactNode;
  action?: React.ReactNode;
  /** contextual = true first-run/zero-content (“start building”), secondary = filtered/search-empty (“nothing matches”) */
  variant?: EmptyVariant;
}

export function EmptyState({
  title,
  description,
  icon: Icon = PackageOpen,
  illustration,
  action,
  variant = "contextual",
}: EmptyStateProps) {
  const isSecondary = variant === "secondary";
  const ContainerClass = isSecondary
    ? "platform-card-secondary flex flex-col items-center justify-center px-[var(--admin-card-px)] py-8 text-center"
    : "platform-card-contextual flex flex-col items-center justify-center px-[var(--admin-card-px)] py-[var(--admin-empty-py)] text-center";
  const ResolvedIcon = isSecondary && Icon === PackageOpen ? SearchX : Icon;

  return (
    <div className={ContainerClass}>
      {illustration ? (
        <div className="mb-4" aria-hidden="true">
          {illustration}
        </div>
      ) : (
        <div className={isSecondary ? "mb-3 rounded-full bg-[var(--surface-hover)] p-3" : "mb-4 rounded-full bg-[var(--surface-hover)] p-4"}>
          <ResolvedIcon
            className={isSecondary ? "h-5 w-5 text-[var(--text-muted)]" : "h-8 w-8 text-[var(--text-muted)]"}
            aria-hidden="true"
          />
        </div>
      )}
      <h3 className={isSecondary ? "text-sm font-semibold text-[var(--text-primary)]" : "text-lg font-semibold text-[var(--text-primary)]"}>{title}</h3>
      {description && (
        <p className={isSecondary ? "mt-1 max-w-md text-xs text-[var(--text-muted)]" : "mt-1 max-w-md text-sm text-[var(--text-muted)]"}>{description}</p>
      )}
      {action && <div className={isSecondary ? "mt-4" : "mt-6"}>{action}</div>}
    </div>
  );
}
