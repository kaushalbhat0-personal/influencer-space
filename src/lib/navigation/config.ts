/**
 * Dashboard Navigation Configuration v1.0.0
 *
 * Job-based navigation groups for Creator, Agency, and Super Admin.
 * Permission-aware — each role sees only their relevant items.
 */

import {
  LayoutDashboard, ShoppingBag, Image, Trophy, Gamepad2, Link2,
  Palette, Globe, CreditCard, Settings, Rss, MessageSquare,
  BarChart3, Users, Package, Mail, Bot, Search, FileText,
  Building2, UserCheck, Globe2, Store, Gift, Key,
  Activity, Clock, Layers, Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  badgeVariant?: "default" | "cyan" | "gold" | "success";
  external?: boolean;
  roles: string[];
}

export interface NavGroup {
  label: string;
  description?: string;
  items: NavItem[];
  defaultOpen?: boolean;
  roles: string[];
}

export interface DashboardNav {
  groups: NavGroup[];
  bottomItems: NavItem[];
}

function allRoles(...roles: string[]): string[] { return roles; }

export const CREATOR_NAV: DashboardNav = {
  groups: [
    {
      label: "Website",
      description: "Build your site",
      defaultOpen: true,
      roles: allRoles("ADMIN", "SUPER_ADMIN"),
      items: [
        { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, roles: allRoles("ADMIN", "SUPER_ADMIN") },
        { label: "Builder", href: "/builder", icon: Layers, roles: allRoles("ADMIN", "SUPER_ADMIN") },
        { label: "Appearance", href: "/admin/appearance", icon: Palette, roles: allRoles("ADMIN", "SUPER_ADMIN") },
        { label: "SEO", href: "/admin/seo", icon: Search, roles: allRoles("ADMIN", "SUPER_ADMIN"), badge: "new" },
        { label: "Domain", href: "/admin/settings/domain", icon: Globe, roles: allRoles("ADMIN", "SUPER_ADMIN") },
      ],
    },
    {
      label: "Content",
      description: "Fill your site",
      roles: allRoles("ADMIN", "SUPER_ADMIN"),
      items: [
        { label: "Products", href: "/admin/products", icon: ShoppingBag, roles: allRoles("ADMIN", "SUPER_ADMIN") },
        { label: "Gallery", href: "/admin/gallery", icon: Image, roles: allRoles("ADMIN", "SUPER_ADMIN") },
        { label: "Timeline", href: "/admin/milestones", icon: Trophy, roles: allRoles("ADMIN", "SUPER_ADMIN") },
        { label: "Links", href: "/admin/links", icon: Link2, roles: allRoles("ADMIN", "SUPER_ADMIN") },
        { label: "Games", href: "/admin/games", icon: Gamepad2, roles: allRoles("ADMIN", "SUPER_ADMIN") },
        { label: "Content Feed", href: "/admin/settings/content", icon: Rss, roles: allRoles("ADMIN", "SUPER_ADMIN") },
        { label: "Blog", href: "/admin/blog", icon: FileText, roles: allRoles("ADMIN", "SUPER_ADMIN"), badge: "new" },
      ],
    },
    {
      label: "Sell",
      description: "Make money",
      roles: allRoles("ADMIN", "SUPER_ADMIN"),
      items: [
        { label: "Orders", href: "/admin/orders", icon: Package, roles: allRoles("ADMIN", "SUPER_ADMIN"), badge: "new" },
        { label: "Customers", href: "/admin/customers", icon: Users, roles: allRoles("ADMIN", "SUPER_ADMIN"), badge: "new" },
        { label: "Payments", href: "/admin/payments", icon: CreditCard, roles: allRoles("ADMIN", "SUPER_ADMIN"), badge: "new" },
      ],
    },
    {
      label: "Grow",
      description: "Get bigger",
      roles: allRoles("ADMIN", "SUPER_ADMIN"),
      items: [
        { label: "Analytics", href: "/admin/analytics", icon: BarChart3, roles: allRoles("ADMIN", "SUPER_ADMIN"), badge: "new" },
        { label: "Email", href: "/admin/email", icon: Mail, roles: allRoles("ADMIN", "SUPER_ADMIN"), badge: "new" },
        { label: "AI Assistant", href: "/admin/ai-assistant", icon: Bot, roles: allRoles("ADMIN", "SUPER_ADMIN"), badge: "new" },
      ],
    },
    {
      label: "Settings",
      description: "Manage everything",
      roles: allRoles("ADMIN", "SUPER_ADMIN"),
      items: [
        { label: "Website Settings", href: "/admin/settings", icon: Settings, roles: allRoles("ADMIN", "SUPER_ADMIN") },
        { label: "Messages", href: "/admin/messages", icon: MessageSquare, roles: allRoles("ADMIN", "SUPER_ADMIN") },
        { label: "Billing", href: "/admin/billing", icon: CreditCard, roles: allRoles("ADMIN", "SUPER_ADMIN") },
      ],
    },
  ],
  bottomItems: [],
};

export const SUPER_ADMIN_NAV: DashboardNav = {
  groups: [
    {
      label: "Platform",
      defaultOpen: true,
      roles: allRoles("SUPER_ADMIN"),
      items: [
        { label: "Dashboard", href: "/super-admin", icon: LayoutDashboard, roles: allRoles("SUPER_ADMIN") },
        { label: "Revenue", href: "/super-admin/revenue", icon: BarChart3, roles: allRoles("SUPER_ADMIN"), badge: "new" },
        { label: "Tenants", href: "/super-admin/tenants", icon: Building2, roles: allRoles("SUPER_ADMIN") },
        { label: "Agencies", href: "/super-admin/agencies", icon: Store, roles: allRoles("SUPER_ADMIN"), badge: "new" },
      ],
    },
    {
      label: "Operations",
      roles: allRoles("SUPER_ADMIN"),
      items: [
        { label: "Creator Import", href: "/super-admin/generate", icon: Bot, roles: allRoles("SUPER_ADMIN") },
        { label: "Subscriptions", href: "/super-admin/subscriptions", icon: Gift, roles: allRoles("SUPER_ADMIN"), badge: "new" },
        { label: "Themes", href: "/super-admin/themes", icon: Palette, roles: allRoles("SUPER_ADMIN"), badge: "new" },
        { label: "API Keys", href: "/super-admin/api-keys", icon: Key, roles: allRoles("SUPER_ADMIN"), badge: "new" },
      ],
    },
    {
      label: "System",
      roles: allRoles("SUPER_ADMIN"),
      items: [
        { label: "Feature Flags", href: "/super-admin/features", icon: Wrench, roles: allRoles("SUPER_ADMIN") },
        { label: "System Health", href: "/super-admin/health", icon: Activity, roles: allRoles("SUPER_ADMIN") },
        { label: "Audit Log", href: "/super-admin/audit", icon: Clock, roles: allRoles("SUPER_ADMIN") },
      ],
    },
  ],
  bottomItems: [],
};

export const AGENCY_NAV: DashboardNav = {
  groups: [
    {
      label: "Agency",
      defaultOpen: true,
      roles: allRoles("AGENCY_ADMIN", "AGENCY_STAFF"),
      items: [
        { label: "Dashboard", href: "/agency", icon: LayoutDashboard, roles: allRoles("AGENCY_ADMIN", "AGENCY_STAFF") },
        { label: "Clients", href: "/agency/clients", icon: UserCheck, roles: allRoles("AGENCY_ADMIN", "AGENCY_STAFF"), badge: "new" },
        { label: "Websites", href: "/agency/websites", icon: Globe2, roles: allRoles("AGENCY_ADMIN", "AGENCY_STAFF"), badge: "new" },
      ],
    },
    {
      label: "Tools",
      roles: allRoles("AGENCY_ADMIN", "AGENCY_STAFF"),
      items: [
        { label: "Creator Import", href: "/agency/generate", icon: Bot, roles: allRoles("AGENCY_ADMIN", "AGENCY_STAFF") },
        { label: "Templates", href: "/agency/templates", icon: Layers, roles: allRoles("AGENCY_ADMIN", "AGENCY_STAFF"), badge: "new" },
        { label: "Analytics", href: "/agency/analytics", icon: BarChart3, roles: allRoles("AGENCY_ADMIN", "AGENCY_STAFF"), badge: "new" },
      ],
    },
    {
      label: "Manage",
      roles: allRoles("AGENCY_ADMIN", "AGENCY_STAFF"),
      items: [
        { label: "Domains", href: "/agency/domains", icon: Globe, roles: allRoles("AGENCY_ADMIN", "AGENCY_STAFF"), badge: "new" },
        { label: "Team", href: "/agency/team", icon: Users, roles: allRoles("AGENCY_ADMIN", "AGENCY_STAFF"), badge: "new" },
        { label: "Billing", href: "/agency/billing", icon: CreditCard, roles: allRoles("AGENCY_ADMIN"), badge: "new" },
      ],
    },
  ],
  bottomItems: [],
};

export function getNavForRole(role: string): DashboardNav {
  if (role === "SUPER_ADMIN") return SUPER_ADMIN_NAV;
  if (role === "AGENCY_ADMIN" || role === "AGENCY_STAFF") return AGENCY_NAV;
  return CREATOR_NAV;
}

export function getVisibleGroups(nav: DashboardNav, role: string): NavGroup[] {
  return nav.groups.filter((g) => g.roles.includes(role));
}

export function getVisibleItems(group: NavGroup, role: string): NavItem[] {
  return group.items.filter((i) => i.roles.includes(role));
}
