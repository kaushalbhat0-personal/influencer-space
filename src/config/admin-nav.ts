import {
  LayoutDashboard, ShoppingBag, Package, Users, Image as ImageIcon,
  Trophy, Gamepad2, Rss, Link2, BarChart3, MessageSquare,
  Layout, Palette, Search, Globe, CreditCard, Settings,
  ExternalLink, LogOut,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: "unread" | "pending" | "soon";
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

export const ADMIN_NAV: NavConfig = {
  groups: [
    { items: [{ href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard }] },

    {
      label: "Sell", collapsible: true,
      items: [
        { href: "/admin/products", label: "Products", icon: ShoppingBag },
        { href: "/admin/orders", label: "Orders", icon: Package },
        { href: "/admin/customers", label: "Customers", icon: Users },
      ],
    },

    {
      label: "Content", collapsible: true,
      items: [
        { href: "/admin/gallery", label: "Gallery", icon: ImageIcon },
        { href: "/admin/milestones", label: "Milestones", icon: Trophy },
        { href: "/admin/games", label: "Games", icon: Gamepad2 },
        { href: "/admin/settings/content", label: "Content Feed", icon: Rss },
      ],
    },

    {
      label: "Grow", collapsible: true,
      items: [
        { href: "/admin/links", label: "Links", icon: Link2 },
        { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
        { href: "/admin/messages", label: "Messages", icon: MessageSquare },
      ],
    },

    { items: [{ href: "/builder", label: "Builder", icon: Layout }] },

    {
      label: "Settings", collapsible: true,
      items: [
        { href: "/admin/appearance", label: "Appearance", icon: Palette },
        { href: "/admin/seo", label: "SEO", icon: Search },
        { href: "/admin/settings/domain", label: "Domain", icon: Globe },
        { href: "/admin/billing", label: "Billing", icon: CreditCard },
        { href: "/admin/settings", label: "Settings", icon: Settings },
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
