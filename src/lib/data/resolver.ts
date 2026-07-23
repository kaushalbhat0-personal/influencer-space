import { prisma } from "@/lib/prisma";

export interface ResolvedComponentData {
  /** Title/heading for the section */
  title?: string;
  /** Display items (products, gallery images, timeline events, etc.) */
  items?: Record<string, unknown>[];
  /** Fallback when no domain data exists */
  empty: boolean;
}

/**
 * Resolves dashboard domain data for Builder components.
 * Components store entityType + tenantId. This service fetches the real data.
 */
export class DataResolver {
  async resolve(config: Record<string, unknown>, tenantId?: string): Promise<ResolvedComponentData> {
    const entityType = config.entityType as string | undefined;
    const entityId = config.entityId as string | undefined;

    if (entityType === "product" && tenantId) {
      return this.resolveProducts(tenantId, entityId);
    }
    if (entityType === "gallery" && tenantId) {
      return this.resolveGallery(tenantId, entityId);
    }
    if (entityType === "timeline" && tenantId) {
      return this.resolveTimeline(tenantId, entityId);
    }
    if (entityType === "affiliate" && tenantId) {
      return this.resolveAffiliateLinks(tenantId, entityId);
    }
    if (entityType === "social" && tenantId) {
      return this.resolveSocialProfiles(tenantId);
    }

    // No entity type specified — return empty
    return { empty: true };
  }

  private async resolveProducts(tenantId: string, productId?: string): Promise<ResolvedComponentData> {
    const where: Record<string, unknown> = { tenantId, isActive: true };
    if (productId) where.id = productId;

    const products = await prisma.product.findMany({
      where: JSON.parse(JSON.stringify(where)),
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      select: { id: true, name: true, description: true, price: true, imageUrl: true },
    });

    return {
      title: "Products",
      items: products.map((p) => ({ ...p, price: p.price })),
      empty: products.length === 0,
    };
  }

  private async resolveGallery(tenantId: string, _galleryId?: string): Promise<ResolvedComponentData> {
    void _galleryId;
    const images = await prisma.galleryImage.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      select: { id: true, title: true, description: true, imageUrl: true, mediaType: true, videoUrl: true },
    });

    return {
      title: "Gallery",
      items: images.map((g) => ({
        id: g.id,
        url: g.mediaType === "video" && g.videoUrl ? g.videoUrl : g.imageUrl,
        caption: g.description || g.title,
        isVideo: g.mediaType === "video",
      })),
      empty: images.length === 0,
    };
  }

  private async resolveTimeline(tenantId: string, _eventId?: string): Promise<ResolvedComponentData> {
    void _eventId;
    const events = await prisma.timelineEvent.findMany({
      where: { tenantId, isActive: true },
      orderBy: { year: "desc" },
      select: { id: true, year: true, title: true, description: true, imageUrl: true },
    });

    return {
      title: "Timeline",
      items: events,
      empty: events.length === 0,
    };
  }

  private async resolveAffiliateLinks(tenantId: string, _linkId?: string): Promise<ResolvedComponentData> {
    void _linkId;
    const links = await prisma.affiliateLink.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      select: { id: true, title: true, url: true, imageUrl: true },
    });

    return {
      title: "Links",
      items: links,
      empty: links.length === 0,
    };
  }

  private async resolveSocialProfiles(tenantId: string): Promise<ResolvedComponentData> {
    const website = await prisma.website.findUnique({
      where: { tenantId },
      include: { brand: { select: { socialLinks: true } } },
    });

    const rawLinks = website?.brand?.socialLinks;
    const socialLinks: { platform: string; url: string }[] = Array.isArray(rawLinks) ? rawLinks as { platform: string; url: string }[] : [];

    return {
      title: "Social",
      items: socialLinks,
      empty: socialLinks.length === 0,
    };
  }
}

export const dataResolver = new DataResolver();
