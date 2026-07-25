import type { QuickStartStep } from "./types";

interface QuickStartInput {
  productCount: number;
  hasCustomDomain: boolean;
  hasSEO: boolean;
}

export function getQuickStartSteps(data: QuickStartInput): QuickStartStep[] {
  return [
    { id: "profile", label: "Complete your profile", href: "/admin/settings", done: true, estimatedMinutes: 2 },
    { id: "products", label: "Add your first product", href: "/admin/products", done: data.productCount > 0, estimatedMinutes: 3 },
    { id: "domain", label: "Connect a custom domain", href: "/admin/settings/domain", done: data.hasCustomDomain, estimatedMinutes: 5 },
    { id: "seo", label: "Configure SEO", href: "/admin/seo", done: data.hasSEO, estimatedMinutes: 3 },
  ];
}
