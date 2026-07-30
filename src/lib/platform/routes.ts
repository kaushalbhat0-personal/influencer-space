export const RESERVED_PATHS = new Set([
  "",           // /
  "pricing",
  "features",
  "showcase",
  "about",
  "blog",
  "contact",
  "faq",
  "signup",
  "privacy",
  "terms",
  "refund",
  "admin",
  "super-admin",
  "agency",
  "workspace",
  "builder",
  "onboarding",
  "api",
  "_next",
]);

export enum RouteCategory {
  PublicMarketing = "public_marketing",
  PublicStorefront = "public_storefront",
  Admin = "admin",
  SuperAdmin = "super_admin",
  Agency = "agency",
  Builder = "builder",
  Onboarding = "onboarding",
  Api = "api",
  Static = "static",
  NextInternal = "next_internal",
  Unknown = "unknown",
}

export interface RouteClassification {
  category: RouteCategory;
  pathname: string;
  slug?: string;
}

export function classifyRoute(pathname: string): RouteClassification {
  const normalized = pathname.replace(/\/$/, "") || "/";
  const normalizedForCheck = normalized === "/" ? "" : normalized.slice(1);
  const segments = normalizedForCheck.split("/").filter(Boolean);
  const topLevel = segments[0] || "";

  // Static and internal routes
  if (topLevel.startsWith("_next") || topLevel.startsWith("__")) {
    return { category: RouteCategory.NextInternal, pathname: normalized };
  }

  // API routes
  if (topLevel === "api") {
    return { category: RouteCategory.Api, pathname: normalized };
  }

  // Known protected routes
  if (topLevel === "super-admin") {
    return { category: RouteCategory.SuperAdmin, pathname: normalized };
  }
  if (topLevel === "admin") {
    return { category: RouteCategory.Admin, pathname: normalized };
  }
  if (topLevel === "agency" || topLevel === "workspace") {
    return { category: RouteCategory.Agency, pathname: normalized };
  }
  if (topLevel === "builder") {
    return { category: RouteCategory.Builder, pathname: normalized };
  }
  if (topLevel === "onboarding") {
    return { category: RouteCategory.Onboarding, pathname: normalized };
  }

  // Known public marketing routes
  if (topLevel === "" || RESERVED_PATHS.has(topLevel)) {
    return { category: RouteCategory.PublicMarketing, pathname: normalized };
  }

  // Everything else that isn't a reserved path is a storefront slug
  // This handles: /owais, /any-creator-slug
  if (segments.length === 1 && !RESERVED_PATHS.has(topLevel)) {
    return { category: RouteCategory.PublicStorefront, pathname: normalized, slug: topLevel };
  }

  return { category: RouteCategory.PublicMarketing, pathname: normalized };
}

export function requiresAuthentication(category: RouteCategory): boolean {
  switch (category) {
    case RouteCategory.Admin:
    case RouteCategory.SuperAdmin:
    case RouteCategory.Agency:
    case RouteCategory.Builder:
    case RouteCategory.Onboarding:
      return true;
    case RouteCategory.PublicMarketing:
    case RouteCategory.PublicStorefront:
    case RouteCategory.Api:
    case RouteCategory.Static:
    case RouteCategory.NextInternal:
    case RouteCategory.Unknown:
      return false;
  }
}
