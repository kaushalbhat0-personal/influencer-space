import { prisma } from "@/lib/prisma";
import type { NavigationItem } from "@/types/snapshot";

const NAV_KEY = "navigation" as const;

export class NavigationService {
  async get(tenantId: string): Promise<NavigationItem[]> {
    const setting = await prisma.setting.findUnique({
      where: { tenantId_key: { tenantId, key: NAV_KEY } },
      select: { value: true },
    });
    if (setting?.value && Array.isArray(setting.value)) {
      return JSON.parse(JSON.stringify(setting.value)) as NavigationItem[];
    }
    return [];
  }

  async save(tenantId: string, items: NavigationItem[]): Promise<void> {
    const sanitized = JSON.parse(JSON.stringify(items));
    await prisma.setting.upsert({
      where: { tenantId_key: { tenantId, key: NAV_KEY } },
      create: { tenantId, key: NAV_KEY, value: sanitized },
      update: { value: sanitized },
    });
  }

  async generateDefaults(tenantId: string): Promise<NavigationItem[]> {
    const [website, products, gallery, links, timeline, testimonials, faq, games, contentFeed] =
      await Promise.all([
        prisma.website.findUnique({
          where: { tenantId },
          select: { id: true },
        }),
        prisma.product.count({ where: { tenantId, status: "PUBLISHED", isActive: true, archivedAt: null } }),
        prisma.galleryImage.count({ where: { tenantId, status: "PUBLISHED", isActive: true, archivedAt: null } }),
        prisma.affiliateLink.count({ where: { tenantId, isActive: true } }),
        prisma.timelineEvent.count({ where: { tenantId } }),
        prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "testimonials" } }, select: { value: true } }),
        prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "faq" } }, select: { value: true } }),
        prisma.game.count({ where: { tenantId, isActive: true } }),
        prisma.contentFeedItem.count({ where: { tenantId, hidden: false } }),
      ]);

    const testimonialsCount = testimonials?.value && Array.isArray(testimonials.value)
      ? testimonials.value.length
      : 0;
    const faqCount = faq?.value && Array.isArray(faq.value)
      ? faq.value.length
      : 0;

    const nav: NavigationItem[] = [];
    let order = 0;

    nav.push({ id: "hero", label: "Home", href: "#hero", type: "anchor", order: order++, visible: true });

    if (products > 0) {
      nav.push({ id: "products", label: "Products", href: "#products", type: "anchor", order: order++, visible: true });
    }
    if (gallery > 0) {
      nav.push({ id: "gallery", label: "Gallery", href: "#gallery", type: "anchor", order: order++, visible: true });
    }
    if (timeline > 0) {
      nav.push({ id: "timeline", label: "Timeline", href: "#timeline", type: "anchor", order: order++, visible: true });
    }
    if (testimonialsCount > 0) {
      nav.push({ id: "testimonials", label: "Testimonials", href: "#testimonials", type: "anchor", order: order++, visible: true });
    }
    if (faqCount > 0) {
      nav.push({ id: "faq", label: "FAQ", href: "#faq", type: "anchor", order: order++, visible: true });
    }
    if (games > 0) {
      nav.push({ id: "games", label: "Games", href: "#games", type: "anchor", order: order++, visible: true });
    }
    if (contentFeed > 0) {
      nav.push({ id: "contentFeed", label: "Content", href: "#contentFeed", type: "anchor", order: order++, visible: true });
    }
    if (links > 0) {
      nav.push({ id: "links", label: "Links", href: "#links", type: "anchor", order: order++, visible: true });
    }

    if (website?.id) {
      nav.push({ id: "contact", label: "Contact", href: "#contact", type: "anchor", order: order++, visible: true });
    }

    await this.save(tenantId, nav);
    return nav;
  }

  async getOrGenerate(tenantId: string): Promise<NavigationItem[]> {
    const existing = await this.get(tenantId);
    if (existing.length > 0) return existing;
    return this.generateDefaults(tenantId);
  }

  async resetToDefaults(tenantId: string): Promise<NavigationItem[]> {
    return this.generateDefaults(tenantId);
  }
}

export const navigationService = new NavigationService();
