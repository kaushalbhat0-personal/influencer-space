import {
  LayoutDashboard, ShoppingBag, Package, Users, Image as ImageIcon,
  Trophy, Rss, Link2, BarChart3, MessageSquare,
  Layout, Palette, Search, Globe, CreditCard,
  ExternalLink, LogOut, UserCheck, BookOpen, HelpCircle, Puzzle,
  User, Menu, Sparkles, Gamepad as GamepadIcon,
  Paintbrush, LayoutTemplate, Wand2, Brain, Target, Landmark, Bell, Briefcase,
  CalendarDays,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: "unread" | "pending" | "soon";
  /**
   * RCCF-67.4 — optional capability gate (UX only; server gates stay
   * authoritative). When set, the item is visible only when the tenant's
   * resolved plan satisfies the capability.
   */
  requiredCapability?: string;
  /** Numeric limit the feature must be > 0 (e.g. max_bookings). Default true. */
  requiredLimitAbove?: boolean;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
  collapsible?: boolean;
}

export interface NavConfig {
  groups: NavGroup[];
  footer: NavItem[];
}

/**
 * RCCF-70.6.2 — canonical icon keys emitted across the Server → Client boundary.
 *
 * A nav item's Lucide component (`icon: LucideIcon`) is a `forwardRef` object
 * (`{ $$typeof, render, displayName }`) that Next.js cannot serialize in an RSC
 * payload. The server therefore projects only the icon's Lucide `displayName`
 * (`iconKey`) and the client resolves presentation via `adminNavIconRegistry`.
 * This list must stay in sync with that registry; `toNavWire` falls back to
 * "Menu" rather than risk a second production 500.
 */
export const ADMIN_NAV_ICON_KEYS = [
  "LayoutDashboard", "Wand2", "Sparkles", "Image", "Rss", "Trophy", "UserCheck",
  "HelpCircle", "Link2", "Gamepad", "ShoppingBag", "Briefcase", "BookOpen",
  "Package", "Users", "CalendarDays", "Landmark", "Layout", "Paintbrush",
  "LayoutTemplate", "Palette", "Menu", "BarChart3", "MessageSquare", "Brain",
  "Target", "User", "Search", "Globe", "CreditCard", "Bell", "Puzzle",
  "ExternalLink", "LogOut",
] as const;

export type AdminNavIconKey = (typeof ADMIN_NAV_ICON_KEYS)[number];

export function isAdminNavIconKey(value: string): value is AdminNavIconKey {
  return (ADMIN_NAV_ICON_KEYS as readonly string[]).includes(value);
}

/**
 * Wire-safe projection of the navigation contract. Contains only plain
 * serializable values — no React components, functions, or capability metadata.
 * Capability filtering stays server-side; clients never see `requiredCapability`.
 */
export interface NavItemWire {
  href: string;
  label: string;
  iconKey: AdminNavIconKey;
  badge?: NavItem["badge"];
}

export interface NavGroupWire {
  label?: string;
  items: NavItemWire[];
  collapsible?: boolean;
}

export interface NavConfigWire {
  groups: NavGroupWire[];
  footer: NavItemWire[];
}

export const ADMIN_NAV: NavConfig = {
  groups: [
    { items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/create", label: "Create Website", icon: Wand2 },
    ]},

    {
      label: "Content", collapsible: true,
      items: [
        { href: "/admin/settings", label: "Hero", icon: Sparkles },
        { href: "/admin/gallery", label: "Gallery", icon: ImageIcon, requiredCapability: "max_gallery" },
        { href: "/admin/settings/content", label: "Content Feed", icon: Rss, requiredCapability: "max_feed" },
        { href: "/admin/milestones", label: "Timeline", icon: Trophy, requiredCapability: "max_timeline" },
        { href: "/admin/testimonials", label: "Testimonials", icon: UserCheck, requiredCapability: "max_testimonials" },
        { href: "/admin/faq", label: "FAQ", icon: HelpCircle, requiredCapability: "max_faq" },
        { href: "/admin/links", label: "Links", icon: Link2, requiredCapability: "max_links" },
        { href: "/admin/games", label: "Games", icon: GamepadIcon, requiredCapability: "max_games" },
      ],
    },

    {
      label: "Sell", collapsible: true,
      items: [
        { href: "/admin/products", label: "Products", icon: ShoppingBag, requiredCapability: "max_products" },
        { href: "/admin/services", label: "Services", icon: Briefcase, requiredCapability: "max_services" },
        { href: "/admin/courses", label: "Courses", icon: BookOpen, requiredCapability: "max_courses" },
        { href: "/admin/orders", label: "Orders", icon: Package, requiredCapability: "max_orders" },
        { href: "/admin/customers", label: "Customers", icon: Users, requiredCapability: "max_orders" },
        { href: "/admin/bookings", label: "Bookings", icon: CalendarDays, requiredCapability: "max_bookings" },
        { href: "/admin/payments", label: "Payments", icon: Landmark },
      ],
    },

    {
      label: "Design", collapsible: true,
      items: [
        { href: "/builder", label: "Builder", icon: Layout },
        { href: "/admin/themes", label: "Themes", icon: Paintbrush },
        { href: "/admin/blueprints", label: "Templates", icon: LayoutTemplate },
        { href: "/admin/appearance", label: "Appearance", icon: Palette },
        { href: "/admin/website/navigation", label: "Navigation", icon: Menu },
        { href: "/admin/footer", label: "Footer", icon: Layout },
      ],
    },

    {
      label: "Grow", collapsible: true,
      items: [
        { href: "/admin/analytics", label: "Analytics", icon: BarChart3, requiredCapability: "analytics_basic" },
        { href: "/admin/messages", label: "Messages", icon: MessageSquare },
        { href: "/admin/knowledge", label: "Brand", icon: Brain },
        { href: "/admin/goals", label: "Goals", icon: Target },
      ],
    },

    {
      label: "Settings", collapsible: true,
      items: [
        { href: "/admin/profile", label: "Account", icon: User },
        { href: "/admin/seo", label: "Get Found on Google", icon: Search },
        { href: "/admin/legal", label: "Legal", icon: BookOpen },
        { href: "/admin/settings/domain", label: "Domain", icon: Globe, requiredCapability: "custom_domain" },
        { href: "/admin/billing", label: "Billing", icon: CreditCard },
        { href: "/admin/notifications", label: "Notifications", icon: Bell },
        { href: "/admin/integrations", label: "Integrations", icon: Puzzle, requiredCapability: "api_access" },
      ],
    },
  ],

  footer: [
    { href: "", label: "View Website", icon: ExternalLink },
    { href: "", label: "Sign Out", icon: LogOut },
  ],
};

export function findNavItem(href: string): { group: NavGroup; item: NavItem } | null {
  for (const group of ADMIN_NAV.groups) {
    for (const item of group.items) {
      if (item.href === href) return { group, item };
    }
  }
  return null;
}