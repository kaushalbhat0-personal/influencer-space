// MIT — derived from shadcn/ui breadcrumb (https://ui.shadcn.com/docs/components/breadcrumb)
// Hardened: correct nav semantics (aria-label), asChild/Slot via manual clone (no new dep),
// data-slot, aria-current on page, presentation hidden on separators/ellipsis.
"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Breadcrumb({ className, ...props }: React.ComponentPropsWithoutRef<"nav">) {
  return (
    <nav
      aria-label="breadcrumb"
      data-slot="breadcrumb"
      className={cn("text-sm text-[var(--text-muted)]", className)}
      {...props}
    />
  );
}

export function BreadcrumbList({ className, ...props }: React.ComponentPropsWithoutRef<"ol">) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn("flex flex-wrap items-center gap-1.5 break-words", className)}
      {...props}
    />
  );
}

export function BreadcrumbItem({ className, ...props }: React.ComponentPropsWithoutRef<"li">) {
  return <li data-slot="breadcrumb-item" className={cn("inline-flex items-center gap-1.5", className)} {...props} />;
}

export function BreadcrumbLink({
  className,
  asChild,
  children,
  ...props
}: React.ComponentPropsWithoutRef<"a"> & { asChild?: boolean; children?: React.ReactNode }) {
  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ className?: string }>;
    return React.cloneElement(child, {
      "data-slot": "breadcrumb-link",
      className: cn(
        "transition-colors hover:text-[var(--text-primary)] text-[var(--text-muted)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2",
        className,
        (child.props as { className?: string }).className
      ),
      // Pass through remaining props as attributes where valid
      ...(props as Record<string, unknown>),
    } as unknown as Record<string, unknown>);
  }
  return (
    <a
      data-slot="breadcrumb-link"
      className={cn(
        "transition-colors hover:text-[var(--text-primary)] text-[var(--text-muted)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2",
        className
      )}
      {...props}
    >
      {children}
    </a>
  );
}

export function BreadcrumbPage({ className, ...props }: React.ComponentPropsWithoutRef<"span">) {
  return (
    <span
      aria-current="page"
      data-slot="breadcrumb-page"
      className={cn("font-medium text-[var(--text-primary)]", className)}
      {...props}
    />
  );
}

export function BreadcrumbSeparator({
  children,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"li">) {
  return (
    <li
      role="presentation"
      aria-hidden="true"
      data-slot="breadcrumb-separator"
      className={cn("text-[var(--text-muted)]", className)}
      {...props}
    >
      {children ?? <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
    </li>
  );
}

export function BreadcrumbEllipsis({ className, ...props }: React.ComponentPropsWithoutRef<"span">) {
  return (
    <span
      role="presentation"
      aria-hidden="true"
      data-slot="breadcrumb-ellipsis"
      className={cn("flex h-9 w-9 items-center justify-center text-[var(--text-muted)]", className)}
      {...props}
    >
      <span className="h-1 w-1 rounded-full bg-current" aria-hidden="true" />
      <span className="ml-1 h-1 w-1 rounded-full bg-current" aria-hidden="true" />
      <span className="ml-1 h-1 w-1 rounded-full bg-current" aria-hidden="true" />
      <span className="sr-only">More</span>
    </span>
  );
}
