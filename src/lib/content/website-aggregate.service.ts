import { prisma } from "@/lib/prisma";
import { brandRepository } from "@/modules/tenant/infrastructure/brand-repository";
import { productRepository } from "@/modules/tenant/infrastructure/product-repository";
import { galleryRepository } from "@/modules/tenant/infrastructure/gallery-repository";
import { linkRepository } from "@/modules/tenant/infrastructure/link-repository";
import { websiteRepository } from "@/modules/tenant/infrastructure/website-repository";
import { SettingsService } from "@/services/settings.service";
import type { WebsiteAggregate } from "@/types/snapshot";

export class WebsiteAggregateService {
  async build(tenantId: string): Promise<WebsiteAggregate> {
    const [brand, heroData, products, gallery, links, seoData, website, timelineEvents, gameList, feedItems, testimonialsData, faqData] = await Promise.all([
      brandRepository.findByTenantId(tenantId),
      SettingsService.getHeroData(tenantId),
      productRepository.findPublished(tenantId),
      galleryRepository.findPublished(tenantId),
      linkRepository.findPublished(tenantId),
      SettingsService.getSeo(tenantId),
      websiteRepository.findByTenantId(tenantId),
      prisma.timelineEvent.findMany({
        where: { tenantId },
        orderBy: { year: "desc" },
      }),
      prisma.game.findMany({
        where: { tenantId },
        orderBy: { order: "asc" },
      }),
      prisma.contentFeedItem.findMany({
        where: { tenantId, hidden: false },
        orderBy: [{ pinned: "desc" }, { order: "asc" }, { createdAt: "desc" }],
      }),
      SettingsService.getSettingByKey(tenantId, "testimonials"),
      SettingsService.getSettingByKey(tenantId, "faq"),
    ]);

    const rawTestimonials = Array.isArray(testimonialsData)
      ? (testimonialsData as Record<string, unknown>[])
      : [];

    const rawFaq = Array.isArray(faqData)
      ? (faqData as Record<string, unknown>[])
      : [];

    return {
      identity: {
        name: brand?.name ?? website?.tenant?.name ?? "",
        tagline: brand?.tagline ?? "",
        bio: brand?.bio ?? "",
        avatarUrl: brand?.avatarUrl ?? null,
        bannerUrl: brand?.bannerUrl ?? null,
        socialLinks: (brand?.socialLinks as Array<{ platform: string; url: string }>) ?? [],
      },
      hero: {
        title: (heroData as Record<string, unknown>)?.title as string ?? "",
        subtitle: (heroData as Record<string, unknown>)?.subtitle as string ?? "",
        description: (heroData as Record<string, unknown>)?.description as string ?? "",
        videoUrl: (heroData as Record<string, unknown>)?.videoUrl as string | null ?? null,
        posterUrl: (heroData as Record<string, unknown>)?.posterUrl as string | null ?? null,
        ctaText: (heroData as Record<string, unknown>)?.ctaText as string ?? "",
        ctaLink: (heroData as Record<string, unknown>)?.ctaLink as string ?? "",
        ctaSecondaryText: (heroData as Record<string, unknown>)?.ctaSecondaryText as string ?? "",
        ctaSecondaryLink: (heroData as Record<string, unknown>)?.ctaSecondaryLink as string ?? "",
        liveBadgeText: (heroData as Record<string, unknown>)?.liveBadgeText as string ?? "",
        showLiveBadge: (heroData as Record<string, unknown>)?.showLiveBadge as boolean ?? false,
        imageUrl: (heroData as Record<string, unknown>)?.imageUrl as string | null ?? null,
      },
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        imageUrl: p.imageUrl,
        images: Array.isArray(p.images) ? (p.images as string[]) : [],
        slug: p.slug ?? "",
        isFeatured: p.isFeatured,
        isActive: p.isActive,
      })),
      gallery: gallery.map((g) => ({
        id: g.id,
        title: g.title,
        description: g.description,
        imageUrl: g.imageUrl,
        mediaType: (g.mediaType ?? "image") as "image" | "video",
        videoUrl: g.videoUrl,
        altText: g.altText,
        isFeatured: g.isFeatured,
      })),
      links: links.map((l) => ({
        id: l.id,
        title: l.title,
        url: l.url,
        imageUrl: l.imageUrl,
      })),
      seo: {
        title: ((seoData as { title?: string } | null)?.title) ?? "",
        description: ((seoData as { description?: string } | null)?.description) ?? "",
      },
      testimonials: rawTestimonials.map((item) => ({
        id: (item.id as string) ?? "",
        author: item.author as string,
        role: (item.role as string) ?? null,
        content: item.content as string,
        avatarUrl: (item.avatarUrl as string) ?? null,
        rating: (item.rating as number) ?? 5,
        featured: (item.featured as boolean) ?? false,
        category: (item.category as string) ?? "general",
      })),
      faq: rawFaq.map((item) => ({
        id: (item.id as string) ?? "",
        question: item.question as string,
        answer: item.answer as string,
        category: (item.category as string) ?? "general",
      })),
      timeline: timelineEvents.map((e) => ({
        id: e.id,
        year: e.year,
        title: e.title,
        description: e.description,
        imageUrl: e.imageUrl,
        stats: e.stats,
      })),
      games: gameList.map((g) => ({
        id: g.id,
        name: g.name,
        logoUrl: g.logoUrl,
        description: g.description,
        genre: g.genre,
      })),
      contentFeed: feedItems.map((item) => ({
        id: item.id,
        platform: item.platform,
        mediaType: item.mediaType,
        url: item.url,
        thumbnailUrl: item.thumbnailUrl,
        caption: item.caption,
        permalink: item.permalink,
      })),
    };
  }
}

export const websiteAggregateService = new WebsiteAggregateService();
