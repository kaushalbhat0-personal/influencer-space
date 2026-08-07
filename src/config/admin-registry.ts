import {
  LayoutDashboard, Activity, Building2, Users, Palette, Layers,
  Headphones, BarChart3, CreditCard, ScrollText, Settings,
  UserCog, UserPlus, Sparkles, CheckCircle2, Bot, Globe,
  ToggleRight, Timer, FileText, IndianRupee, TrendingUp, Monitor, Clock,
  Lightbulb, Percent, RefreshCw, Bell, BookOpen, Target, HeartPulse, Tag, Landmark,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AdminGroup = "overview" | "creators" | "commerce" | "integrity" | "marketplace" | "system" | "diagnostics";
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
  // ── Platform ────────────────────────────────────────────────────
  {
    id: "dashboard", title: "Dashboard", group: "overview",
    href: "/super-admin", icon: LayoutDashboard, permission: "super_admin",
    searchable: true, keywords: ["home", "stats", "overview", "health"],
    auditCategory: "dashboard", analyticsKey: "dashboard:viewed",
    productionReady: true,
  },
  {
    id: "operations", title: "Operations", group: "overview",
    href: "/super-admin/operations", icon: Activity, permission: "super_admin",
    searchable: true, keywords: ["engines", "recovery", "diagnostics", "jobs", "events"],
    auditCategory: "system", analyticsKey: "operations:viewed",
    productionReady: true,
  },
  {
    id: "health", title: "Platform Health", group: "overview",
    href: "/super-admin/health", icon: Activity, permission: "super_admin",
    searchable: true, keywords: ["status", "monitor", "uptime", "database", "storage"],
    auditCategory: "system", analyticsKey: "health:viewed",
    productionReady: true,
  },
  {
    id: "activity", title: "Activity", group: "overview",
    href: "/super-admin/activity", icon: Clock, permission: "super_admin",
    searchable: true, keywords: ["timeline", "events", "recent", "history", "log"],
    auditCategory: "system", analyticsKey: "activity:viewed",
    productionReady: true,
  },
  {
    id: "insights", title: "Insights", group: "overview",
    href: "/super-admin/insights", icon: Lightbulb, permission: "super_admin",
    searchable: true, keywords: ["intelligence", "alerts", "attention", "health", "summary"],
    auditCategory: "system", analyticsKey: "insights:viewed",
    productionReady: true,
  },
  {
    id: "recommendations", title: "Recommendations", group: "overview",
    href: "/super-admin/recommendations", icon: Target, permission: "super_admin",
    searchable: true, keywords: ["recommendations", "next action", "completion", "goal", "knowledge", "suggested"],
    auditCategory: "intelligence", analyticsKey: "recommendations:viewed",
    productionReady: true,
  },
  {
    id: "business-health", title: "Business Health", group: "overview",
    href: "/super-admin/business-health", icon: HeartPulse, permission: "super_admin",
    searchable: true, keywords: ["health", "score", "kpi", "average", "distribution", "dimensions"],
    auditCategory: "intelligence", analyticsKey: "business-health:viewed",
    productionReady: true,
  },
  {
    id: "experience-intelligence", title: "Experience Intelligence", group: "overview",
    href: "/super-admin/experience-intelligence", icon: Layers, permission: "super_admin",
    searchable: true, keywords: ["experience", "industries", "goals", "themes", "distribution"],
    auditCategory: "intelligence", analyticsKey: "experience-intelligence:viewed",
    productionReady: true,
  },
  {
    id: "evolution", title: "Website Evolution", group: "overview",
    href: "/super-admin/evolution", icon: TrendingUp, permission: "super_admin",
    searchable: true, keywords: ["evolution", "improvements", "applied", "adoption", "growth"],
    auditCategory: "intelligence", analyticsKey: "evolution:viewed",
    productionReady: true,
  },
  {
    id: "alerts", title: "Alerts", group: "overview",
    href: "/super-admin/alerts", icon: Bell, permission: "super_admin",
    searchable: true, keywords: ["alerts", "notifications", "warnings", "critical", "triggered", "rules"],
    auditCategory: "system", analyticsKey: "alerts:viewed",
    productionReady: true,
  },
  {
    id: "runbooks", title: "Runbooks", group: "overview",
    href: "/super-admin/runbooks", icon: BookOpen, permission: "super_admin",
    searchable: true, keywords: ["runbooks", "recovery", "guides", "playbooks", "incidents", "sop"],
    auditCategory: "system", analyticsKey: "runbooks:viewed",
    productionReady: true,
  },

  // ── Creators ────────────────────────────────────────────────────
  {
    id: "tenants", title: "Creators", group: "creators",
    href: "/super-admin/tenants", icon: Building2, permission: "super_admin",
    searchable: true, keywords: ["creators", "stores", "websites", "accounts", "list"],
    auditCategory: "tenants", analyticsKey: "tenants:viewed",
    productionReady: true,
  },
  {
    id: "users", title: "Users", group: "creators",
    href: "/super-admin/users", icon: UserCog, permission: "super_admin",
    searchable: true, keywords: ["admins", "accounts", "roles", "permissions"],
    auditCategory: "users", analyticsKey: "users:viewed",
    productionReady: true,
  },
  {
    id: "agencies", title: "Agencies", group: "creators",
    href: "/super-admin/agencies", icon: Users, permission: "super_admin",
    searchable: true, keywords: ["agency", "clients", "managed", "partners"],
    auditCategory: "agencies", analyticsKey: "agencies:viewed",
    productionReady: true,
  },
  {
    id: "support", title: "Support", group: "creators",
    href: "/super-admin/support", icon: Headphones, permission: "super_admin",
    searchable: true, keywords: ["tickets", "help", "assistance", "queries", "lookup", "search"],
    auditCategory: "support", analyticsKey: "support:viewed",
    productionReady: true,
  },
  {
    id: "websites", title: "Websites", group: "creators",
    href: "/super-admin/websites", icon: Monitor, permission: "super_admin",
    searchable: true, keywords: ["websites", "storefronts", "published", "domains"],
    auditCategory: "tenants", analyticsKey: "websites:viewed",
    productionReady: true,
  },

  // ── Marketplace ─────────────────────────────────────────────────
  {
    id: "themes", title: "Themes", group: "marketplace",
    href: "/super-admin/themes", icon: Palette, permission: "super_admin",
    searchable: true, keywords: ["design", "appearance", "brand", "marketplace"],
    auditCategory: "marketplace", analyticsKey: "themes:viewed",
    productionReady: true,
  },
  {
    id: "templates", title: "Website Templates", group: "marketplace",
    href: "/super-admin/templates", icon: Layers, permission: "super_admin",
    searchable: true, keywords: ["presets", "layouts", "reusable", "blueprint"],
    auditCategory: "marketplace", analyticsKey: "templates:viewed",
    productionReady: true,
  },

  // ── Operations ──────────────────────────────────────────────────
  {
    id: "generate", title: "Creator Import", group: "diagnostics",
    href: "/super-admin/generate", icon: Bot, permission: "super_admin",
    searchable: true, keywords: ["import", "website", "create", "auto", "generation"],
    auditCategory: "ai", analyticsKey: "generation:viewed",
    productionReady: true,
  },
  {
    id: "demo-studio", title: "Demo Studio", group: "diagnostics",
    href: "/super-admin/demo-studio", icon: Sparkles, permission: "super_admin",
    searchable: true, keywords: ["demo", "generate", "showcase", "sample"],
    auditCategory: "demo", analyticsKey: "demo:viewed",
    productionReady: true,
  },
  {
    id: "demo-publishing", title: "Publishing", group: "diagnostics",
    href: "/super-admin/demo-publishing", icon: CheckCircle2, permission: "super_admin",
    searchable: true, keywords: ["review", "approve", "publish", "workflow"],
    auditCategory: "demo", analyticsKey: "demo-publishing:viewed",
    productionReady: true,
  },
  {
    id: "demo-library", title: "Demo Library", group: "diagnostics",
    href: "/super-admin/demo-library", icon: Layers, permission: "super_admin",
    searchable: true, keywords: ["seeds", "library", "catalog", "industries"],
    auditCategory: "demo", analyticsKey: "demo-library:viewed",
    productionReady: true,
  },
  {
    id: "beta", title: "Beta Program", group: "diagnostics",
    href: "/super-admin/beta", icon: UserPlus, permission: "super_admin",
    searchable: true, keywords: ["invites", "beta", "early", "access", "testers"],
    auditCategory: "beta", analyticsKey: "beta:viewed",
    productionReady: true,
  },

  // ── Billing ─────────────────────────────────────────────────────
  {
    id: "revenue", title: "Revenue Reports", group: "commerce",
    href: "/super-admin/revenue", icon: TrendingUp, permission: "super_admin",
    searchable: true, keywords: ["mrr", "arr", "money", "income", "earnings"],
    auditCategory: "revenue", analyticsKey: "revenue:viewed",
    productionReady: true,
  },
  {
    id: "revenue-management", title: "Revenue Management", group: "commerce",
    href: "/super-admin/revenue-management", icon: Percent, permission: "super_admin",
    searchable: true, keywords: ["pricing", "plans", "commissions", "billing", "settings", "rates"],
    auditCategory: "revenue", analyticsKey: "revenue-management:viewed",
    productionReady: true,
  },
  {
    id: "subscriptions", title: "Subscriptions", group: "commerce",
    href: "/super-admin/subscriptions", icon: CreditCard, permission: "super_admin",
    searchable: true, keywords: ["plans", "billing", "recurring", "payment"],
    auditCategory: "billing", analyticsKey: "subscriptions:viewed",
    productionReady: true,
  },
  {
    id: "pricing-center", title: "Pricing Center", group: "commerce",
    href: "/super-admin/pricing", icon: Tag, permission: "super_admin",
    searchable: true, keywords: ["pricing", "plans", "marketing", "highlights", "badges", "annual", "trial"],
    auditCategory: "billing", analyticsKey: "pricing:viewed",
    productionReady: true,
  },
  {
    id: "revenue-center", title: "Revenue Center", group: "commerce",
    href: "/super-admin/revenue-center", icon: IndianRupee, permission: "super_admin",
    searchable: true, keywords: ["revenue", "commission", "settlement", "payout", "ledger", "agency share", "subscription revenue"],
    auditCategory: "revenue", analyticsKey: "revenue-center:viewed",
    productionReady: true,
  },
  {
    id: "commerce-center", title: "Commerce Center", group: "commerce",
    href: "/super-admin/commerce-center", icon: Landmark, permission: "super_admin",
    searchable: true, keywords: ["commerce strategy", "payment strategy", "merchant of record", "direct creator", "platform collect"],
    auditCategory: "commerce", analyticsKey: "commerce-center:viewed",
    productionReady: true,
  },
  {
    id: "customer-success", title: "Customer Success", group: "creators",
    href: "/super-admin/customer-success", icon: HeartPulse, permission: "super_admin",
    searchable: true, keywords: ["customer success", "at risk", "churn", "journey", "success score", "needs help"],
    auditCategory: "growth", analyticsKey: "customer-success:viewed",
    productionReady: true,
  },
  {
    id: "communication", title: "Communication", group: "system",
    href: "/super-admin/communication", icon: Bell, permission: "super_admin",
    searchable: true, keywords: ["communication", "notifications", "email", "delivery", "alerts", "retry"],
    auditCategory: "system", analyticsKey: "communication:viewed",
    productionReady: true,
  },
  {
    id: "generation-monitor", title: "Generation Monitor", group: "system",
    href: "/super-admin/generation-monitor", icon: Activity, permission: "super_admin",
    searchable: true, keywords: ["generation", "onboarding", "progress", "stages", "sessions", "duration"],
    auditCategory: "system", analyticsKey: "generation-monitor:viewed",
    productionReady: true,
  },
  {
    id: "invoices", title: "Invoices", group: "commerce",
    href: "/super-admin/invoices", icon: FileText, permission: "super_admin",
    searchable: false, keywords: ["receipts", "bills", "statements"],
    productionReady: true,
  },
  {
    id: "payments", title: "Payments", group: "commerce",
    href: "/super-admin/payments", icon: IndianRupee, permission: "super_admin",
    searchable: true, keywords: ["transactions", "gateway", "razorpay"],
    auditCategory: "billing", analyticsKey: "payments:viewed",
    productionReady: true,
  },
  {
    id: "finance", title: "Finance Dashboard", group: "commerce",
    href: "/super-admin/finance", icon: TrendingUp, permission: "super_admin",
    searchable: true, keywords: ["finance", "settlements", "partner", "payout", "liability"],
    auditCategory: "finance", analyticsKey: "finance:viewed",
    productionReady: true,
  },
  {
    id: "settlements", title: "Settlements", group: "commerce",
    href: "/super-admin/settlements", icon: CreditCard, permission: "super_admin",
    searchable: true, keywords: ["payout", "partner", "transfer", "bank"],
    auditCategory: "finance", analyticsKey: "settlements:viewed",
    productionReady: true,
  },
  {
    id: "partner-ledger", title: "Partner Ledger", group: "commerce",
    href: "/super-admin/partner-ledger", icon: ScrollText, permission: "super_admin",
    searchable: true, keywords: ["ledger", "balance", "commission", "earnings"],
    auditCategory: "finance", analyticsKey: "partner-ledger:viewed",
    productionReady: true,
  },
  {
    id: "reconciliation", title: "Reconciliation", group: "integrity",
    href: "/super-admin/reconciliation", icon: RefreshCw, permission: "super_admin",
    searchable: true, keywords: ["reconcile", "orphan", "imbalance", "repair"],
    auditCategory: "finance", analyticsKey: "reconciliation:viewed",
    productionReady: true,
  },

  {
    id: "integrity", title: "Platform Integrity", group: "integrity",
    href: "/super-admin/integrity", icon: CheckCircle2, permission: "super_admin",
    searchable: true, keywords: ["integrity", "orphan", "cleanup", "delete", "repair"],
    auditCategory: "system", analyticsKey: "integrity:viewed",
    productionReady: true,
  },

  // ── Audit ───────────────────────────────────────────────────────
  {
    id: "audit", title: "Audit Log", group: "system",
    href: "/super-admin/audit", icon: ScrollText, permission: "super_admin",
    searchable: true, keywords: ["history", "events", "trace", "log"],
    auditCategory: "system", analyticsKey: "audit:viewed",
    productionReady: true,
  },
  {
    id: "events", title: "Events", group: "system",
    href: "/super-admin/events", icon: Timer, permission: "super_admin",
    searchable: true, keywords: ["event bus", "types", "messages", "history"],
    auditCategory: "system", analyticsKey: "events:viewed",
    productionReady: true,
  },
  {
    id: "webhooks", title: "Webhooks", group: "system",
    href: "/super-admin/webhooks", icon: Globe, permission: "super_admin",
    searchable: true, keywords: ["events", "gateway", "razorpay", "stripe"],
    auditCategory: "billing", analyticsKey: "webhooks:viewed",
    productionReady: true,
  },

  // ── System ──────────────────────────────────────────────────────
  {
    id: "features", title: "Feature Flags", group: "system",
    href: "/super-admin/features", icon: ToggleRight, permission: "super_admin",
    searchable: true, keywords: ["toggle", "config", "flags", "enable", "disable"],
    auditCategory: "platform", analyticsKey: "features:viewed",
    productionReady: true,
  },
  {
    id: "analytics", title: "Analytics", group: "system",
    href: "/super-admin/analytics", icon: BarChart3, permission: "super_admin",
    searchable: true, keywords: ["charts", "data", "metrics", "funnel", "conversion"],
    auditCategory: "analytics", analyticsKey: "analytics:viewed",
    productionReady: true,
  },
  {
    id: "transactions", title: "Transactions", group: "system",
    href: "/super-admin/transactions", icon: ScrollText, permission: "super_admin",
    searchable: false, keywords: ["events", "stream", "timeline"],
    auditCategory: "billing", analyticsKey: "transactions:viewed",
    productionReady: true,
  },
  {
    id: "settings", title: "Settings", group: "system",
    href: "/super-admin/settings", icon: Settings, permission: "super_admin",
    searchable: false, keywords: ["config", "platform", "general", "preferences"],
    badge: "soon",
    productionReady: false,
  },
  {
    id: "registry-sync", title: "Registry Sync", group: "system",
    href: "/super-admin/platform/sync", icon: RefreshCw, permission: "super_admin",
    searchable: true, keywords: ["sync", "plan catalog", "features", "billing", "migration", "drift"],
    auditCategory: "platform", analyticsKey: "registry-sync:viewed",
    productionReady: true,
  },
];

export function getModulesByGroup(group: AdminGroup): AdminModule[] {
  return ADMIN_REGISTRY.filter((m) => m.group === group);
}

export function getSearchableModules(): AdminModule[] {
  return ADMIN_REGISTRY.filter((m) => m.searchable);
}

export function getModuleById(id: string): AdminModule | undefined {
  return ADMIN_REGISTRY.find((m) => m.id === id);
}

export const GROUP_ORDER: AdminGroup[] = ["overview", "creators", "commerce", "integrity", "marketplace", "system", "diagnostics"];

export function getGroupedModules(): Map<AdminGroup, AdminModule[]> {
  const map = new Map<AdminGroup, AdminModule[]>();
  for (const group of GROUP_ORDER) {
    map.set(group, getModulesByGroup(group));
  }
  return map;
}
