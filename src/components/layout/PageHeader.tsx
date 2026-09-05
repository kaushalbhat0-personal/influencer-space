import { cn } from "@/lib/utils";
import type { BreadcrumbItem } from "./Breadcrumb";
import { Breadcrumb } from "./Breadcrumb";
import type { ReactNode } from "react";

export interface PageHeaderProps {
  title: string;
  description?: string;
  kicker?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  status?: { label: string; variant?: "success" | "warning" | "danger" | "default" };
  tabs?: { label: string; href: string; active?: boolean }[];
  className?: string;
}

export function PageHeader({ title, description, kicker, breadcrumbs, actions, status, tabs, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-8", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="mb-2">
          <Breadcrumb items={breadcrumbs} />
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 min-w-0">
          {kicker && <p className="platform-section-label mb-1.5">{kicker}</p>}
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="platform-display truncate">{title}</h1>
            {status && (
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                  status.variant === "success" && "bg-green-500/20 text-green-400",
                  status.variant === "warning" && "bg-amber-500/20 text-amber-400",
                  status.variant === "danger" && "bg-red-500/20 text-red-400",
                  (!status.variant || status.variant === "default") && "bg-zinc-800 text-[var(--text-primary)]"
                )}
              >
                {status.label}
              </span>
            )}
          </div>
          {description && <p className="platform-body mt-1.5">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
      {tabs && tabs.length > 0 && (
        <nav className="mt-4 flex gap-1 overflow-x-auto border-b border-white/10" aria-label="Page tabs">
          {tabs.map((tab) => (
            <a
              key={tab.href}
              href={tab.href}
              className={cn(
                "whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
                tab.active
                  ? "border-[var(--brand-primary)] text-[var(--brand-primary)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              {tab.label}
            </a>
          ))}
        </nav>
      )}
    </div>
  );
}
