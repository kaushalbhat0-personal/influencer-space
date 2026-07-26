import type { Permission } from "@/modules/workspace/domain/authorization";

export const FEATURE_PERMISSIONS: Record<string, Permission> = {
  profile: "settings:write",
  products: "content:edit",
  services: "content:edit",
  courses: "content:edit",
  gallery: "content:edit",
  links: "content:edit",
  testimonials: "content:edit",
  faq: "content:edit",
  seo: "settings:write",
  analytics: "analytics:view",
  settings: "settings:write",
  domains: "domains:manage",
  billing: "billing:read",
  integrations: "settings:write",
  dashboard: "analytics:view",
};

export function getFeaturePermission(feature: string): Permission {
  return FEATURE_PERMISSIONS[feature] ?? "content:edit";
}
