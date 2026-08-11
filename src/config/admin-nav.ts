import {
  LayoutDashboard, ShoppingBag, Package, Users, Image as ImageIcon,
  Trophy, Rss, Link2, BarChart3, MessageSquare,
  Layout, Palette, Search, Globe, CreditCard,
  ExternalLink, LogOut, UserCheck, BookOpen, HelpCircle, Puzzle,
  User, Menu, Sparkles, Gamepad as GamepadIcon,
  Paintbrush, LayoutTemplate, Wand2, Brain, Target, Landmark, Bell, Briefcase,
  CalendarDays, Heading as HeadingIcon,
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
    { items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/create", label: "Create Website", icon: Wand2 },
    ]},

    {
      label: "Content", collapsible: true,
      items: [
        { href: "/admin/settings", label: "Hero", icon: Sparkles },
        { href: "/admin/gallery", label: "Gallery", icon: ImageIcon },
        { href: "/admin/settings/content", label: "Content Feed", icon: Rss },
        { href: "/admin/milestones", label: "Timeline", icon: Trophy },
        { href: "/admin/testimonials", label: "Testimonials", icon: UserCheck },
        { href: "/admin/faq", label: "FAQ", icon: HelpCircle },
        { href: "/admin/links", label: "Links", icon: Link2 },
        { href: "/admin/games", label: "Games", icon: GamepadIcon },
      ],
    },

    {
      label: "Sell", collapsible: true,
      items: [
        { href: "/admin/products", label: "Products", icon: ShoppingBag },
        { href: "/admin/services", label: "Services", icon: Briefcase },
        { href: "/admin/courses", label: "Courses", icon: BookOpen },
        { href: "/admin/orders", label: "Orders", icon: Package },
        { href: "/admin/customers", label: "Customers", icon: Users },
        { href: "/admin/bookings", label: "Bookings", icon: CalendarDays },
        { href: "/admin/payments", label: "Payments", icon: Landmark, badge: "soon" },
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
        { href: "/admin/website/sections", label: "Sections", icon: HeadingIcon },
      ],
    },

    {
      label: "Grow", collapsible: true,
      items: [
        { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
        { href: "/admin/messages", label: "Messages", icon: MessageSquare },
        { href: "/admin/knowledge", label: "Brand", icon: Brain },
        { href: "/admin/goals", label: "Goals", icon: Target },
      ],
    },

    {
      label: "Settings", collapsible: true,
      items: [
        { href: "/admin/profile", label: "Account", icon: User },
        { href: "/admin/seo", label: "SEO", icon: Search },
        { href: "/admin/settings/domain", label: "Domain", icon: Globe },
        { href: "/admin/billing", label: "Billing", icon: CreditCard },
        { href: "/admin/notifications", label: "Notifications", icon: Bell },
        { href: "/admin/integrations", label: "Integrations", icon: Puzzle },
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