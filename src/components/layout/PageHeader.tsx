import { cn } from "@/lib/utils";
import type { BreadcrumbItem } from "./Breadcrumb";
import { Breadcrumb } from "./Breadcrumb";
import type { ReactNode } from "react";

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  status?: { label: string; variant?: "success" | "warning" | "danger" | "default" };
  tabs?: { label: string; href: string; active?: boolean }[];
  className?: string;
}

export function PageHeader({ title, description, breadcrumbs, actions, status, tabs, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-8", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="mb-2">
          <Breadcrumb items={breadcrumbs} />
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white truncate">{title}</h1>
            {status && (
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                  status.variant === "success" && "bg-green-500/20 text-green-400",
                  status.variant === "warning" && "bg-amber-500/20 text-amber-400",
                  status.variant === "danger" && "bg-red-500/20 text-red-400",
                  (!status.variant || status.variant === "default") && "bg-zinc-800 text-zinc-300"
                )}
              >
                {status.label}
              </span>
            )}
          </div>
          {description && <p className="mt-1 text-sm text-zinc-400">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
      {tabs && tabs.length > 0 && (
        <nav className="mt-4 flex gap-1 border-b border-white/10" aria-label="Page tabs">
          {tabs.map((tab) => (
            <a
              key={tab.href}
              href={tab.href}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
                tab.active
                  ? "border-s8ul-cyan text-s8ul-cyan"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
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
