import {
  LayoutDashboard, ShoppingBag, Package, Users, Image as ImageIcon,
  Trophy, Rss, Link2, BarChart3, MessageSquare,
  Layout, Palette, Search, Globe, CreditCard,
  ExternalLink, LogOut, UserCheck, BookOpen, HelpCircle, Puzzle,
  User, Menu, Sparkles, Gamepad as GamepadIcon, FolderOpen,
  Paintbrush, LayoutTemplate, Wand2, Brain, Target, Landmark, Bell,
  Heading as HeadingIcon,
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
      label: "Store", collapsible: true,
      items: [
        { href: "/admin/products", label: "Products", icon: ShoppingBag },
        { href: "/admin/services", label: "Services", icon: UserCheck },
        { href: "/admin/courses", label: "Courses", icon: BookOpen },
        { href: "/admin/orders", label: "Orders", icon: Package },
        { href: "/admin/customers", label: "Customers", icon: Users },
      ],
    },

    {
      label: "Content", collapsible: true,
      items: [
        { href: "/admin/media", label: "Media Library", icon: FolderOpen },
        { href: "/admin/settings", label: "Hero", icon: Sparkles },
        { href: "/admin/gallery", label: "Gallery", icon: ImageIcon },
        { href: "/admin/settings/content", label: "Content Feed", icon: Rss },
        { href: "/admin/testimonials", label: "Testimonials", icon: UserCheck },
        { href: "/admin/faq", label: "FAQ", icon: HelpCircle },
        { href: "/admin/milestones", label: "Timeline", icon: Trophy },
        { href: "/admin/games", label: "Games", icon: GamepadIcon },
      ],
    },

    {
      label: "Design", collapsible: true,
      items: [
        { href: "/admin/themes", label: "Theme Marketplace", icon: Paintbrush },
        { href: "/admin/blueprints", label: "Website Templates", icon: LayoutTemplate },
        { href: "/admin/appearance", label: "Theme Settings", icon: Palette },
        { href: "/admin/website/navigation", label: "Navigation", icon: Menu },
        { href: "/admin/website/sections", label: "Section Headings", icon: HeadingIcon },
        { href: "/builder", label: "Layout Builder", icon: Layout },
      ],
    },

    {
      label: "Profile", collapsible: true,
      items: [
        { href: "/admin/knowledge", label: "Profile", icon: Brain },
        { href: "/admin/goals", label: "Goals", icon: Target },
        { href: "/admin/profile", label: "Profile", icon: User },
        { href: "/admin/seo", label: "SEO", icon: Search },
      ],
    },

    {
      label: "Marketing", collapsible: true,
      items: [
        { href: "/admin/links", label: "Links", icon: Link2 },
        { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
        { href: "/admin/messages", label: "Messages", icon: MessageSquare },
      ],
    },

    {
      label: "Account", collapsible: true,
      items: [
        { href: "/admin/settings/domain", label: "Domain", icon: Globe },
        { href: "/admin/billing", label: "Billing", icon: CreditCard },
        { href: "/admin/payments", label: "Payments", icon: Landmark },
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
