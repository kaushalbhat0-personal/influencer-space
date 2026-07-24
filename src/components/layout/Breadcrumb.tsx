import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-1 text-xs text-zinc-500", className)}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={item.href ?? item.label} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3 text-zinc-700" />}
            {item.href && !isLast ? (
              <Link href={item.href} className="transition-colors hover:text-zinc-300">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "text-zinc-300" : ""}>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
