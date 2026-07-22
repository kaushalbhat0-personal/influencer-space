/**
 * Super Admin Registry — Single Source of Truth
 *
 * Every admin module (page, feature, capability) is defined once here.
 * Sidebar, breadcrumbs, permissions, search, audit, and analytics
 * all derive from this single registry.
 *
 * Future: Command Palette (Cmd+K), Analytics metadata, Audit categories.
 */

import {
  LayoutDashboard, TrendingUp, BarChart3,
  Building2, Users, Headphones, UserCog, UserPlus, MessageSquare,
  CreditCard, FileText, IndianRupee,
  Bot, Palette, Layers, Sparkles, CheckCircle2,
  ToggleRight, Key, Globe,
  ScrollText, Activity, Timer, Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AdminGroup = "overview" | "operations" | "billing" | "ai-platform" | "platform" | "system";
export type AdminPermission = "super_admin";

export interface AdminModule {
  id: string;
  title: string;
  group: AdminGroup;
  href: string;
  icon: LucideIcon;
  permission: AdminPermission;
  searchable: boolean;
  keywords: string[];
  auditCategory?: string;
  analyticsKey?: string;
  featureFlag?: string;
  badge?: string;
  productionReady: boolean;
}

export const ADMIN_REGISTRY: AdminModule[] = [
  // ── Overview ────────────────────────────────────────────────────────────────
  {
    id: "dashboard", title: "Dashboard", group: "overview",
    href: "/super-admin", icon: LayoutDashboard, permission: "super_admin",
    searchable: true, keywords: ["home", "stats", "overview", "platform"],
    auditCategory: "dashboard", analyticsKey: "dashboard:viewed",
    productionReady: true,
  },
  {
    id: "revenue", title: "Revenue", group: "overview",
    href: "/super-admin/revenue", icon: TrendingUp, permission: "super_admin",
    searchable: true, keywords: ["mrr", "arr", "money", "income", "earnings"],
    auditCategory: "revenue", analyticsKey: "revenue:viewed",
    productionReady: true,
  },
  {
    id: "analytics", title: "Analytics", group: "overview",
    href: "/super-admin/analytics", icon: BarChart3, permission: "super_admin",
    searchable: true, keywords: ["charts", "data", "metrics", "funnel", "conversion", "retention"],
    auditCategory: "analytics", analyticsKey: "analytics:viewed",
    productionReady: true,
  },

  // ── Operations ──────────────────────────────────────────────────────────────
  {
    id: "tenants", title: "Tenants", group: "operations",
    href: "/super-admin/tenants", icon: Building2, permission: "super_admin",
    searchable: true, keywords: ["creators", "stores", "websites", "accounts"],
    auditCategory: "tenants", analyticsKey: "tenants:viewed",
    productionReady: true,
  },
  {
    id: "agencies", title: "Agencies", group: "operations",
    href: "/super-admin/agencies", icon: Users, permission: "super_admin",
    searchable: true, keywords: ["agency", "clients", "managed", "partners"],
    auditCategory: "agencies", analyticsKey: "agencies:viewed",
    productionReady: true,
  },
  {
    id: "beta", title: "Beta Program", group: "operations",
    href: "/super-admin/beta", icon: UserPlus, permission: "super_admin",
    searchable: true, keywords: ["invites", "beta", "early", "access", "testers"],
    auditCategory: "beta", analyticsKey: "beta:viewed",
    productionReady: true,
  },
  {
    id: "feedback", title: "Feedback", group: "operations",
    href: "/super-admin/feedback", icon: MessageSquare, permission: "super_admin",
    searchable: true, keywords: ["bugs", "ideas", "features", "requests", "suggestions"],
    auditCategory: "feedback", analyticsKey: "feedback:viewed",
    productionReady: true,
  },
  {
    id: "users", title: "Users", group: "operations",
    href: "/super-admin/users", icon: UserCog, permission: "super_admin",
    searchable: true, keywords: ["admins", "accounts", "roles", "permissions", "passwords"],
    auditCategory: "users", analyticsKey: "users:viewed",
    productionReady: true,
  },
  {
    id: "support", title: "Support", group: "operations",
    href: "/super-admin/support", icon: Headphones, permission: "super_admin",
    searchable: true, keywords: ["tickets", "help", "assistance", "queries", "lookup", "search"],
    auditCategory: "support", analyticsKey: "support:viewed",
    productionReady: true,
  },

  // ── Billing ─────────────────────────────────────────────────────────────────
  {
    id: "subscriptions", title: "Subscriptions", group: "billing",
    href: "/super-admin/subscriptions", icon: CreditCard, permission: "super_admin",
    searchable: true, keywords: ["plans", "billing", "recurring", "payment"],
    auditCategory: "billing", analyticsKey: "subscriptions:viewed",
    productionReady: true,
  },
  {
    id: "invoices", title: "Invoices", group: "billing",
    href: "/super-admin/invoices", icon: FileText, permission: "super_admin",
    searchable: false, keywords: ["receipts", "bills", "statements"],
    badge: "soon",
    productionReady: false,
  },
  {
    id: "payments", title: "Payments", group: "billing",
    href: "/super-admin/payments", icon: IndianRupee, permission: "super_admin",
    searchable: true, keywords: ["transactions", "gateway", "razorpay"],
    auditCategory: "billing", analyticsKey: "payments:viewed",
    productionReady: true,
  },
  {
    id: "transactions", title: "Transactions", group: "billing",
    href: "/super-admin/transactions", icon: ScrollText, permission: "super_admin",
    searchable: false, keywords: ["events", "stream", "timeline"],
    auditCategory: "billing", analyticsKey: "transactions:viewed",
    productionReady: true,
  },
  {
    id: "webhooks", title: "Webhooks", group: "billing",
    href: "/super-admin/webhooks", icon: Activity, permission: "super_admin",
    searchable: false, keywords: ["events", "gateway", "razorpay", "stripe"],
    auditCategory: "billing", analyticsKey: "webhooks:viewed",
    productionReady: true,
  },

  // ── Creator Platform ────────────────────────────────────────────────────────
  {
    id: "generate", title: "Creator Import", group: "ai-platform",
    href: "/super-admin/generate", icon: Bot, permission: "super_admin",
    searchable: true, keywords: ["import", "website", "create", "auto", "pipeline", "generation"],
    auditCategory: "ai", analyticsKey: "generation:viewed",
    productionReady: true,
  },
  {
    id: "demo-studio", title: "Demo Studio", group: "ai-platform",
    href: "/super-admin/demo-studio", icon: Sparkles, permission: "super_admin",
    searchable: true, keywords: ["demo", "generate", "showcase", "sample", "industry"],
    auditCategory: "demo", analyticsKey: "demo:viewed",
    productionReady: true,
  },
  {
    id: "demo-publishing", title: "Publishing", group: "ai-platform",
    href: "/super-admin/demo-publishing", icon: CheckCircle2, permission: "super_admin",
    searchable: true, keywords: ["review", "approve", "publish", "workflow", "pipeline"],
    auditCategory: "demo", analyticsKey: "demo-publishing:viewed",
    productionReady: true,
  },
  {
    id: "demo-library", title: "Demo Library", group: "ai-platform",
    href: "/super-admin/demo-library", icon: Layers, permission: "super_admin",
    searchable: true, keywords: ["seeds", "library", "catalog", "industries", "templates"],
    auditCategory: "demo", analyticsKey: "demo-library:viewed",
    productionReady: true,
  },
  {
    id: "showcase", title: "Showcase", group: "ai-platform",
    href: "/showcase", icon: Globe, permission: "super_admin",
    searchable: true, keywords: ["gallery", "portfolio", "published", "storefront", "live", "featured"],
    auditCategory: "demo", analyticsKey: "showcase:viewed",
    productionReady: true,
  },
  {
    id: "themes", title: "Themes", group: "ai-platform",
    href: "/super-admin/themes", icon: Palette, permission: "super_admin",
    searchable: false, keywords: ["design", "templates", "appearance", "brand"],
    badge: "soon",
    productionReady: false,
  },
  {
    id: "templates", title: "Templates", group: "ai-platform",
    href: "/super-admin/templates", icon: Layers, permission: "super_admin",
    searchable: false, keywords: ["presets", "layouts", "reusable", "blueprint"],
    badge: "soon",
    productionReady: false,
  },

  // ── Platform ────────────────────────────────────────────────────────────────
  {
    id: "features", title: "Feature Flags", group: "platform",
    href: "/super-admin/features", icon: ToggleRight, permission: "super_admin",
    searchable: true, keywords: ["toggle", "config", "flags", "enable", "disable"],
    auditCategory: "platform", analyticsKey: "features:viewed",
    productionReady: true,
  },
  {
    id: "api-keys", title: "API Keys", group: "platform",
    href: "/super-admin/api-keys", icon: Key, permission: "super_admin",
    searchable: false, keywords: ["tokens", "access", "developer", "api"],
    badge: "soon",
    productionReady: false,
  },
  {
    id: "domains", title: "Domains", group: "platform",
    href: "/super-admin/domains", icon: Globe, permission: "super_admin",
    searchable: false, keywords: ["dns", "ssl", "custom", "vercel", "domain"],
    badge: "soon",
    productionReady: false,
  },

  // ── System ──────────────────────────────────────────────────────────────────
  {
    id: "audit", title: "Audit Log", group: "system",
    href: "/super-admin/audit", icon: ScrollText, permission: "super_admin",
    searchable: true, keywords: ["history", "events", "trace", "log"],
    auditCategory: "system", analyticsKey: "audit:viewed",
    productionReady: true,
  },
  {
    id: "health", title: "Health", group: "system",
    href: "/super-admin/health", icon: Activity, permission: "super_admin",
    searchable: true, keywords: ["status", "monitor", "uptime", "database", "storage"],
    auditCategory: "system", analyticsKey: "health:viewed",
    productionReady: true,
  },
  {
    id: "jobs", title: "Jobs", group: "system",
    href: "/super-admin/jobs", icon: Timer, permission: "super_admin",
    searchable: false, keywords: ["cron", "queue", "background", "worker"],
    badge: "soon",
    productionReady: false,
  },
  {
    id: "settings", title: "Settings", group: "system",
    href: "/super-admin/settings", icon: Settings, permission: "super_admin",
    searchable: false, keywords: ["config", "platform", "general", "preferences"],
    badge: "soon",
    productionReady: false,
  },
];

// ── Derived Views ────────────────────────────────────────────────────────────

export function getModulesByGroup(group: AdminGroup): AdminModule[] {
  return ADMIN_REGISTRY.filter((m) => m.group === group);
}

export function getSearchableModules(): AdminModule[] {
  return ADMIN_REGISTRY.filter((m) => m.searchable);
}

export function getModuleById(id: string): AdminModule | undefined {
  return ADMIN_REGISTRY.find((m) => m.id === id);
}

export const GROUP_ORDER: AdminGroup[] = ["overview", "operations", "billing", "ai-platform", "platform", "system"];

export function getGroupedModules(): Map<AdminGroup, AdminModule[]> {
  const map = new Map<AdminGroup, AdminModule[]>();
  for (const group of GROUP_ORDER) {
    map.set(group, getModulesByGroup(group));
  }
  return map;
}
