import { prisma } from "@/lib/prisma";
import { BuilderService } from "@/lib/builder/builder-service";
import type { NavItem } from "@/config/admin-nav";
import {
  LayoutDashboard, Sparkles, ShoppingBag, Image as ImageIcon, Trophy, Link2, Gamepad2, Rss, HelpCircle, BookOpen, Briefcase, Mail, Layers, Plus, FileText,
} from "lucide-react";

const MODULE_ICON_MAP: Record<string, typeof LayoutDashboard> = {
  hero: Sparkles,
  products: ShoppingBag,
  gallery: ImageIcon,
  timeline: Trophy,
  links: Link2,
  games: Gamepad2,
  contentfeed: Rss,
  faq: HelpCircle,
  courses: BookOpen,
  services: Briefcase,
  contact: Mail,
  newsletter: FileText,
  footer: LayoutDashboard,
};

function iconForModuleId(moduleId: string) {
  const base = moduleId.split(".")[0] ?? "hero";
  return MODULE_ICON_MAP[base] ?? Layers;
}

function labelForSection(section: { name: string; slots: Array<{ moduleId: string; config: Record<string, unknown> }> }): string {
  const slot = section.slots[0];
  const cfgTitle = slot?.config?.title as string | undefined;
  const cfgResolved = slot?.config?.resolvedTitle as string | undefined;
  const title = (cfgResolved || cfgTitle || "").trim();
  // For duplicate moduleIds, prefer the config title to distinguish instances
  if (title && title.length > 0 && title.length < 40) {
    // e.g., Timeline — Professional Experience vs Timeline — Education
    // section.name is "Timeline", title is "Professional Experience" → combine
    if (section.name.toLowerCase() === title.toLowerCase()) return section.name;
    // For Hero, keep "Hero" rather than "KAUSHAL G BHAT" (too long for nav)
    if (section.name.toLowerCase() === "hero" && title.length > 20) return "Hero";
    return title;
  }
  return section.name;
}

/**
 * Derive the dashboard Content nav from the canonical BuilderService Page sections.
 * Each BuilderSection becomes one NavItem with unique href to builder?section=<id>.
 * No archetype hardcoding — purely data-driven from Page.
 */
export async function getDynamicContentNavItems(tenantId: string): Promise<NavItem[]> {
  const website = await prisma.website.findUnique({ where: { tenantId }, select: { id: true } });
  if (!website) {
    try { const { logger } = await import("@/lib/observability/logger"); logger.info("DynamicContentNav no website", "dynamic-content", { metadata: { tenantId } }); } catch {}
    return [];
  }
  const pages = await new BuilderService().load(website.id);
  const home = pages.find((p) => p.isHome) ?? pages[0];
  if (!home || home.sections.length === 0) {
    try { const { logger } = await import("@/lib/observability/logger"); logger.info("DynamicContentNav empty", "dynamic-content", { metadata: { tenantId, pages: pages.length, hasHome: !!home } }); } catch {}
    return [];
  }
  const items: NavItem[] = home.sections.map((section) => {
    const slot = section.slots[0];
    const moduleId = slot?.moduleId ?? "hero.default";
    const label = labelForSection(section as unknown as { name: string; slots: Array<{ moduleId: string; config: Record<string, unknown> }> });
    return {
      label,
      href: `/builder?section=${section.id}`,
      icon: iconForModuleId(moduleId),
      roles: ["ADMIN", "SUPER_ADMIN"],
    } as unknown as NavItem;
  });
  // Deduplicate by label+href if needed, but keep all instances (Timeline ×2 must stay)
  return items;
}

export async function getDynamicContentNavWithAddSection(tenantId: string): Promise<NavItem[]> {
  const items = await getDynamicContentNavItems(tenantId);
  // Add Section is always visible, even when no sections yet
  items.push({
    label: "Add Section",
    href: "/builder?addSection=1",
    icon: Plus,
    roles: ["ADMIN", "SUPER_ADMIN"],
  } as unknown as NavItem);
  // Debug: log for Vercel
  try {
    const { logger } = await import("@/lib/observability/logger");
    logger.info("DynamicContentNav", "dynamic-content", { metadata: { tenantId, count: items.length, labels: items.map((i) => i.label).join(",") } });
  } catch {}
  return items;
}
