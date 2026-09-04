"use client";

import Link from "next/link";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";

interface StorefrontBreadcrumbsProps {
  domain: string;
  pageSlug: string | null;
  pageName?: string;
  getPageHref: (domain: string, pageSlug: string) => string;
}

export function StorefrontBreadcrumbs({ domain, pageSlug, pageName, getPageHref }: StorefrontBreadcrumbsProps) {
  if (!pageSlug) return null;

  const homeHref = getPageHref(domain, "/");
  // Normalize: getPageHref handles domain, but for breadcrumb we want home link
  // For platform domain, home is /{domain}, for subdomain, home is /
  // getPageHref already handles this, so use it for home
  const currentLabel = pageName || pageSlug.charAt(0).toUpperCase() + pageSlug.slice(1);

  return (
    <nav aria-label="Breadcrumb" className="mx-auto max-w-6xl px-4 py-3">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={homeHref} className="inline-flex items-center gap-1.5">
              <Home className="h-3.5 w-3.5" />
              Home
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{currentLabel}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </nav>
  );
}
