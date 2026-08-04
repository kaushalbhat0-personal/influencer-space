import { LifecycleState, type NavigationConfig } from "./types";

const VISITOR_NAV: NavigationConfig = {
  top: [
    { label: "Home", href: "/" },
    { label: "Pricing", href: "/pricing" },
  ],
  main: [
    { label: "Features", href: "/features" },
  ],
  footer: [
    { label: "Login", href: "/admin/login" },
    { label: "Sign Up", href: "/signup" },
  ],
};

const ONBOARDING_NAV: NavigationConfig = {
  top: [
    { label: "Exit", href: "/admin/login?callbackUrl=/onboarding" },
  ],
  main: [],
  footer: [
    { label: "Help", href: "/support" },
  ],
};

const AUTHENTICATED_NAV: NavigationConfig = {
  top: [
    { label: "Dashboard", href: "/admin/dashboard" },
  ],
  main: [],
  footer: [
    { label: "Sign Out", href: "/admin/login" },
  ],
};

const DASHBOARD_NAV: NavigationConfig = {
  top: [
    { label: "Dashboard", href: "/admin/dashboard" },
    { label: "Builder", href: "/builder" },
  ],
  main: [
    { label: "Products", href: "/admin/products", group: "Sell" },
    { label: "Orders", href: "/admin/orders", group: "Sell" },
    { label: "Gallery", href: "/admin/gallery", group: "Content" },
    { label: "Links", href: "/admin/links", group: "Grow" },
    { label: "Analytics", href: "/admin/analytics", group: "Grow" },
    { label: "Appearance", href: "/admin/appearance", group: "Settings" },
    { label: "SEO", href: "/admin/seo", group: "Settings" },
    { label: "Billing", href: "/admin/billing", group: "Settings" },
    { label: "Settings", href: "/admin/settings", group: "Settings" },
  ],
  footer: [
    { label: "Visit Site", href: "/", requiresPublished: true },
    { label: "Sign Out", href: "/admin/login" },
  ],
};

const AGENCY_NAV: NavigationConfig = {
  top: [
    { label: "Dashboard", href: "/agency" },
    { label: "Clients", href: "/agency/clients" },
  ],
  main: [
    { label: "Websites", href: "/agency/websites", group: "Manage" },
    { label: "Team", href: "/agency/team", group: "Manage" },
  ],
  footer: [
    { label: "Admin View", href: "/admin/dashboard" },
    { label: "Sign Out", href: "/admin/login" },
  ],
};

const SUPER_ADMIN_NAV: NavigationConfig = {
  top: [
    { label: "Overview", href: "/super-admin" },
    { label: "Provision", href: "/super-admin/provision" },
  ],
  main: [
    { label: "Tenants", href: "/super-admin/tenants", group: "Platform" },
    { label: "Plans", href: "/super-admin/plans", group: "Platform" },
    { label: "System", href: "/super-admin/system", group: "System" },
    { label: "Logs", href: "/super-admin/logs", group: "System" },
  ],
  footer: [
    { label: "Creator View", href: "/admin/dashboard" },
    { label: "Sign Out", href: "/admin/login" },
  ],
};

export function getNavigation(state: LifecycleState, role: string | null): NavigationConfig {
  if (role === "SUPER_ADMIN") return SUPER_ADMIN_NAV;
  if (role === "AGENCY_ADMIN" || role === "AGENCY_STAFF") return AGENCY_NAV;

  switch (state) {
    case LifecycleState.VISITOR:
    case LifecycleState.REGISTERED:
      return VISITOR_NAV;
    case LifecycleState.ONBOARDING:
    case LifecycleState.GENERATING:
    case LifecycleState.PROVISIONING:
    case LifecycleState.PUBLISHING:
      return ONBOARDING_NAV;
    case LifecycleState.AUTHENTICATED:
      return AUTHENTICATED_NAV;
    case LifecycleState.READY:
    case LifecycleState.EDITING:
    case LifecycleState.PUBLISHED:
      return DASHBOARD_NAV;
    default:
      return VISITOR_NAV;
  }
}

export function getNavigationForRole(role: string | null): NavigationConfig {
  if (role === "SUPER_ADMIN") return SUPER_ADMIN_NAV;
  if (role === "AGENCY_ADMIN" || role === "AGENCY_STAFF") return AGENCY_NAV;
  return DASHBOARD_NAV;
}
