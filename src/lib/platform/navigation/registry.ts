import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, User, ShoppingBag, Package, Users, Image as ImageIcon,
  Trophy, Rss, Link2, BarChart3, MessageSquare,
  Layout, Palette, Search, Globe, CreditCard, Puzzle,
  Menu, Sparkles, Gamepad as GamepadIcon, FolderOpen, UserCheck, BookOpen, HelpCircle,
} from "lucide-react";
import { featureRegistry } from "@/lib/platform/capabilities/registry";
import { entitlementService } from "@/lib/platform/capabilities/entitlements";
import type { PlanTier } from "@/lib/platform/capabilities/subscriptions";

const ICON_MAP: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  profile: User,
  products: ShoppingBag,
  services: UserCheck,
  courses: BookOpen,
  orders: Package,
  customers: Users,
  hero: Sparkles,
  media_library: FolderOpen,
  gallery: ImageIcon,
  content_feed: Rss,
  testimonials: UserCheck,
  faq: HelpCircle,
  timeline: Trophy,
  games: GamepadIcon,
  builder: Layout,
  theme: Palette,
  navigation: Menu,
  seo: Search,
  links: Link2,
  analytics: BarChart3,
  messages: MessageSquare,
  domain: Globe,
  billing: CreditCard,
  integrations: Puzzle,
};

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: "unread" | "pending" | "soon";
  featureId?: string;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
  collapsible?: boolean;
}

export class NavigationRegistry {
  getNavigation(planTier?: PlanTier | null): NavGroup[] {
    const features = featureRegistry.getNavFeatures();
    const groups = new Map<string, NavItem[]>();

    for (const feature of features) {
      if (!feature.navLocation) continue;

      // Check capability entitlement
      if (feature.capabilityId) {
        if (!planTier || !entitlementService.has(planTier, feature.capabilityId)) {
          continue;
        }
      }

      const groupLabel = feature.navLocation.group;
      if (!groups.has(groupLabel)) {
        groups.set(groupLabel, []);
      }

      groups.get(groupLabel)!.push({
        href: this.getFeatureHref(feature.id),
        label: feature.navLocation.label,
        icon: ICON_MAP[feature.id] ?? LayoutDashboard,
        featureId: feature.id,
      });
    }

    // Sort items within each group by order
    const groupEntries = Array.from(groups.entries());
    for (const [, items] of groupEntries) {
      items.sort((a: NavItem, b: NavItem) => {
        const aFeat = features.find((f) => f.id === a.featureId);
        const bFeat = features.find((f) => f.id === b.featureId);
        return (aFeat?.navLocation?.order ?? 0) - (bFeat?.navLocation?.order ?? 0);
      });
    }

    const result: NavGroup[] = [];

    // Dashboard first
    result.push({ items: [{ href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard }] });

    // Content groups in order
    const groupOrder = ["Store", "Content", "Website", "Marketing", "Account"];
    for (const groupLabel of groupOrder) {
      const items = groups.get(groupLabel);
      if (items && items.length > 0) {
        result.push({ label: groupLabel, items, collapsible: true });
      }
    }

    return result;
  }

  private getFeatureHref(featureId: string): string {
    const routeMap: Record<string, string> = {
      dashboard: "/admin/dashboard",
      profile: "/admin/profile",
      products: "/admin/products",
      services: "/admin/services",
      courses: "/admin/courses",
      orders: "/admin/orders",
      customers: "/admin/customers",
      hero: "/admin/settings",
      media_library: "/admin/media",
      gallery: "/admin/gallery",
      content_feed: "/admin/settings/content",
      testimonials: "/admin/testimonials",
      faq: "/admin/faq",
      timeline: "/admin/milestones",
      games: "/admin/games",
      builder: "/builder",
      theme: "/admin/appearance",
      navigation: "/admin/website/navigation",
      seo: "/admin/seo",
      links: "/admin/links",
      analytics: "/admin/analytics",
      messages: "/admin/messages",
      domain: "/admin/settings/domain",
      billing: "/admin/billing",
      integrations: "/admin/integrations",
    };
    return routeMap[featureId] ?? `/admin/${featureId}`;
  }
}

export const navigationRegistry = new NavigationRegistry();
