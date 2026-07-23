import { loadProducts, loadGallery, loadTimeline, loadAffiliates } from "./loaders";
import { prisma } from "@/lib/prisma";
import type { ResolvedComponentData } from "./loaders";

export { ResolvedComponentData };

/**
 * Resolves dashboard domain data for Builder components.
 * Components store entityType + tenantId. Delegates to canonical loaders.
 */
export class DataResolver {
  async resolve(config: Record<string, unknown>, tenantId?: string): Promise<ResolvedComponentData> {
    const entityType = config.entityType as string | undefined;

    if (entityType === "product" && tenantId) {
      const entityId = config.entityId as string | undefined;
      return loadProducts(tenantId, entityId);
    }
    if (entityType === "gallery" && tenantId) {
      return loadGallery(tenantId);
    }
    if (entityType === "timeline" && tenantId) {
      return loadTimeline(tenantId);
    }
    if (entityType === "affiliate" && tenantId) {
      return loadAffiliates(tenantId);
    }
    if (entityType === "social" && tenantId) {
      return this.resolveSocialProfiles(tenantId);
    }

    return { empty: true };
  }

  private async resolveSocialProfiles(tenantId: string): Promise<ResolvedComponentData> {
    const website = await prisma.website.findUnique({
      where: { tenantId },
      include: { brand: { select: { socialLinks: true } } },
    });

    const rawLinks = website?.brand?.socialLinks;
    const socialLinks: { platform: string; url: string }[] = Array.isArray(rawLinks) ? rawLinks as { platform: string; url: string }[] : [];

    return { title: "Social", items: socialLinks, empty: socialLinks.length === 0 };
  }
}

export const dataResolver = new DataResolver();
