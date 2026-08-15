import { prisma } from "@/lib/prisma";
import { brandRepository } from "@/modules/tenant/infrastructure/brand-repository";
import { productRepository } from "@/modules/tenant/infrastructure/product-repository";
import { galleryRepository } from "@/modules/tenant/infrastructure/gallery-repository";
import { linkRepository } from "@/modules/tenant/infrastructure/link-repository";
import { websiteRepository } from "@/modules/tenant/infrastructure/website-repository";
import { SettingsService } from "@/services/settings.service";
import { mediaService } from "@/lib/media/service";
import { normalizeAssetId } from "@/lib/media/resolve";
import { describeHeroMedia, resolveHeroMediaForRuntime } from "@/lib/media/hero-media";
import { normalizeCommerceMode } from "@/config/commerce/commerce-mode";
import { resolveWhatsAppDestination } from "@/lib/commerce/whatsapp";
import type { WebsiteAggregate } from "@/types/snapshot";

export interface AggregateDiagnostics {
  /** Asset ids rejected by the safe resolver (empty/malformed), with origin. */
  invalidAssetIds: Array<{ id: string; module: string; field?: string }>;
  /** Valid asset ids that resolved to no public URL (missing/deleted). */
  skippedAssets: number;
  /** Per-module query failures (module degraded, aggregate still returned). */
  moduleFailures: string[];
}

/**
 * RCCF-IMPLEMENTATION-09B (Phase 3) — aggregate build options.
 *
 * `homepage` mode curates repeatable collections for the homepage:
 *   - featured items first (with a fallback to ALL items when none are
 *     featured, so an un-curated storefront never shows an empty section)
 *   - capped at `homepageLimit` so a 500-product catalog never floods the
 *     homepage (JSON-LD, DOM, aggregate size).
 * Full collection pages ([domain]/[slug]) build WITHOUT homepage mode and
 * receive the complete collections (Phase 6 adds pagination there).
 */
export interface AggregateBuildOptions {
  homepage?: boolean;
  /** Per-collection homepage caps (defaults apply when omitted). */
  homepageLimit?: {
    products?: number;
    gallery?: number;
    courses?: number;
    services?: number;
    testimonials?: number;
    games?: number;
    timeline?: number;
    links?: number;
    contentFeed?: number;
  };
}

export const DEFAULT_HOMEPAGE_LIMITS = {
  products: 12,
  gallery: 12,
  courses: 12,
  services: 12,
  testimonials: 6,
  games: 12,
  timeline: 12,
  links: 12,
  contentFeed: 12,
} as const;

/** Featured-first pick with a zero-featured fallback to all items. */
export function featuredPick<T>(items: T[], limit: number): T[] {
  if (items.length === 0) return items;
  const featured = items.filter((i) => Boolean((i as { isFeatured?: boolean; featured?: boolean }).isFeatured ?? (i as { featured?: boolean }).featured));
  const base = featured.length > 0 ? featured : items;
  return base.slice(0, limit);
}

export class WebsiteAggregateService {
  async build(tenantId: string, options?: AggregateBuildOptions): Promise<WebsiteAggregate> {
    return (await this.buildWithCollector(tenantId, null, options)).aggregate;
  }

  /**
   * Build the aggregate AND collect data-resolution diagnostics. The aggregate
   * never hard-fails: a single broken module degrades to empty and is recorded
   * in `moduleFailures`, so the Builder/Storefront/Publish keep working and the
   * trace reports exactly what went wrong.
   */
  async buildWithDiagnostics(tenantId: string, options?: AggregateBuildOptions): Promise<{
    aggregate: WebsiteAggregate;
    invalidAssetIds: AggregateDiagnostics["invalidAssetIds"];
    skippedAssets: number;
    moduleFailures: string[];
  }> {
    const diagnostics: AggregateDiagnostics = { invalidAssetIds: [], skippedAssets: 0, moduleFailures: [] };
    const { aggregate } = await this.buildWithCollector(tenantId, diagnostics, options);
    return {
      aggregate,
      invalidAssetIds: diagnostics.invalidAssetIds,
      skippedAssets: diagnostics.skippedAssets,
      moduleFailures: diagnostics.moduleFailures,
    };
  }

  private async buildWithCollector(
    tenantId: string,
    diagnostics: AggregateDiagnostics | null,
    options?: AggregateBuildOptions,
  ): Promise<{ aggregate: WebsiteAggregate }> {
    const safe = async <T>(name: string, fn: () => Promise<T>): Promise<T | null> => {
      try {
        return await fn();
      } catch (error) {
        if (diagnostics) {
          diagnostics.moduleFailures.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
        }
        return null;
      }
    };

    const recordInvalidAsset = (id: string, module: string, field?: string): void => {
      if (diagnostics) diagnostics.invalidAssetIds.push({ id, module, field });
    };

    // RCCF-IMPLEMENTATION-09B (Phase 3/6): homepage curation. When homepage mode
    // is on, repeatable collections show featured items first (capped), with a
    // fallback to all items when none are featured. Limits are pushed down to
    // the query layer so the DB never returns the full catalog.
    const homepage = options?.homepage ?? false;
    const limit = (key: keyof typeof DEFAULT_HOMEPAGE_LIMITS): number =>
      options?.homepageLimit?.[key] ?? DEFAULT_HOMEPAGE_LIMITS[key];
    const curated = <T>(items: T[], key: keyof typeof DEFAULT_HOMEPAGE_LIMITS): T[] =>
      homepage ? featuredPick(items, limit(key)) : items;

    const [
      brand, heroData, products, gallery, links, seoData, website, timelineEvents,
      gameList, feedItems, testimonialsData, faqData, offerings, knowledgeCompletion,
      openBookings,
    ] = await Promise.all([
      safe("brand", () => brandRepository.findByTenantId(tenantId)),
      safe("hero", () => SettingsService.getHeroData(tenantId)),
      safe("products", () => this.loadProducts(tenantId, homepage, options)),
      safe("gallery", () => this.loadGallery(tenantId, homepage, options)),
      safe("links", () => linkRepository.findPublished(tenantId)),
      safe("seo", () => SettingsService.getSeo(tenantId)),
      safe("website", () => websiteRepository.findByTenantId(tenantId)),
      safe("timeline", () => prisma.timelineEvent.findMany({ where: { tenantId }, orderBy: { year: "desc" }, ...(homepage ? { take: this.limit("timeline") } : {}) })),
      safe("games", () => prisma.game.findMany({ where: { tenantId }, orderBy: { order: "asc" }, ...(homepage ? { take: this.limit("games") } : {}) })),
      safe("contentFeed", () => prisma.contentFeedItem.findMany({
        where: { tenantId, hidden: false },
        orderBy: [{ pinned: "desc" }, { order: "asc" }, { createdAt: "desc" }],
        ...(homepage ? { take: this.limit("contentFeed") } : {}),
      })),
      safe("testimonials", () => SettingsService.getSettingByKey(tenantId, "testimonials")),
      safe("faq", () => SettingsService.getSettingByKey(tenantId, "faq")),
      safe("offerings", () => prisma.offering.findMany({
        where: { tenantId, status: "published" },
        orderBy: { createdAt: "desc" },
        select: { id: true, type: true, title: true, description: true, price: true, metadata: true, bookable: true },
        ...(homepage ? { take: this.limit("courses") + this.limit("services") } : {}),
      })),
      safe("knowledgeCompletion", () => SettingsService.getSettingByKey(tenantId, "knowledge_completion")),
      // RCCF-67.4 — bookable slots: creator-created OPEN bookings (no customer
      // claimed yet), not cancelled, not in the past. Only future slots are
      // exposed so the storefront never offers an already-past appointment.
      // RCCF-67.5 — slots now carry offeringId so service-linked availability
      // can be grouped per Service.
      safe("openBookings", () => prisma.booking.findMany({
        where: { tenantId, customerEmail: null, status: { not: "cancelled" }, slotDate: { gte: new Date() } },
        orderBy: { slotDate: "asc" },
      })),
    ]);

    // RCCF-INTEGRATION-01 Phase 7: creator-verified declared facts (achievements,
    // mission, languages, refund policy, community, newsletter) flow to the
    // storefront so only facts the CREATOR confirmed are ever displayed.
    const declaredFacts = knowledgeCompletion && typeof knowledgeCompletion === "object"
      ? ((knowledgeCompletion as { facts?: Record<string, unknown> }).facts ?? {})
      : {};

    const rawTestimonials = Array.isArray(testimonialsData)
      ? (testimonialsData as Record<string, unknown>[])
      : [];

    const rawFaq = Array.isArray(faqData)
      ? (faqData as Record<string, unknown>[])
      : [];

    // Hero is the single source of truth for social/streaming links and bio.
    const heroRecord = (heroData as Record<string, unknown>) ?? {};
    const heroSocialLinks = Array.isArray(heroRecord.socialLinks)
      ? (heroRecord.socialLinks as Array<{ platform: string; url: string; label?: string }>)
      : [];
    const heroBio = (heroRecord.bio as string) ?? "";
    const heroName = (heroRecord.name as string) ?? "";
    const heroProfilePictureUrl = (heroRecord.profilePictureUrl as string) ?? "";

    // RCCF-66.2: server-authoritative WhatsApp destination from the creator's
    // Hero social links (platform === "whatsapp"). Resolved ONCE here and baked
    // into every product so the storefront never needs a live read and can never
    // receive a client-supplied number.
    const whatsappDestination = resolveWhatsAppDestination(heroSocialLinks);

    const result: WebsiteAggregate = {
      identity: {
        name: (heroName || brand?.name) ?? website?.tenant?.name ?? "",
        tagline: ((heroRecord.tagline as string) || brand?.tagline) ?? "",
        bio: (heroBio || brand?.bio) ?? "",
        avatarUrl: (heroProfilePictureUrl || brand?.avatarUrl) ?? null,
        bannerUrl: brand?.bannerUrl ?? null,
        socialLinks: heroSocialLinks.length > 0
          ? heroSocialLinks
          : ((brand?.socialLinks as Array<{ platform: string; url: string }>) ?? []),
      },
      declaredFacts,
      hero: {
        title: (heroData as Record<string, unknown>)?.title as string ?? "",
        name: heroName,
        profilePictureUrl: heroProfilePictureUrl,
        subtitle: (heroData as Record<string, unknown>)?.subtitle as string ?? "",
        tagline: (heroData as Record<string, unknown>)?.tagline as string ?? "",
        description: (heroData as Record<string, unknown>)?.description as string ?? "",
        videoUrl: (heroData as Record<string, unknown>)?.videoUrl as string | null ?? null,
        posterUrl: (heroData as Record<string, unknown>)?.posterUrl as string | null ?? null,
        videoAssetId: (heroData as Record<string, unknown>)?.videoAssetId as string | null ?? null,
        posterAssetId: (heroData as Record<string, unknown>)?.posterAssetId as string | null ?? null,
        backgroundUrl: (heroData as Record<string, unknown>)?.backgroundUrl as string | null ?? null,
        backgroundAssetId: (heroData as Record<string, unknown>)?.backgroundAssetId as string | null ?? null,
        bio: heroBio,
        socialLinks: heroSocialLinks,
        ctaText: (heroData as Record<string, unknown>)?.ctaText as string ?? "",
        ctaLink: (heroData as Record<string, unknown>)?.ctaLink as string ?? "",
        ctaSecondaryText: (heroData as Record<string, unknown>)?.ctaSecondaryText as string ?? "",
        ctaSecondaryLink: (heroData as Record<string, unknown>)?.ctaSecondaryLink as string ?? "",
        liveBadgeText: (heroData as Record<string, unknown>)?.liveBadgeText as string ?? "",
        showLiveBadge: (heroData as Record<string, unknown>)?.showLiveBadge as boolean ?? false,
        imageUrl: (heroData as Record<string, unknown>)?.imageUrl as string | null ?? null,
        videoDesktopAlignment: (heroData as Record<string, unknown>)?.videoDesktopAlignment as "top" | "center" | "bottom" ?? "center",
        videoMobileAlignment: (heroData as Record<string, unknown>)?.videoMobileAlignment as "top" | "center" | "bottom" ?? "center",
        imageDesktopAlignment: (heroData as Record<string, unknown>)?.imageDesktopAlignment as "top" | "center" | "bottom" ?? "center",
        imageMobileAlignment: (heroData as Record<string, unknown>)?.imageMobileAlignment as "top" | "center" | "bottom" ?? "center",
      },
      products: curated((products ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        imageUrl: p.imageUrl,
        images: Array.isArray(p.images) ? (p.images as string[]) : [],
        slug: p.slug ?? "",
        isFeatured: p.isFeatured,
        isActive: p.isActive,
        // RCCF-66.2: carry the per-product sales mode + the creator's resolved
        // WhatsApp destination (from hero socialLinks) so the published
        // storefront renders the right CTA without live business reads.
        commerceMode: normalizeCommerceMode(p.commerceMode),
        whatsappUrl: whatsappDestination,
      })), "products"),
      gallery: curated((gallery ?? []).map((g) => ({
        id: g.id,
        title: g.title,
        description: g.description,
        imageUrl: g.imageUrl,
        mediaType: (g.mediaType ?? "image") as "image" | "video",
        videoUrl: g.videoUrl,
        altText: g.altText,
        isFeatured: g.isFeatured,
      })), "gallery"),
      links: curated((links ?? []).map((l) => ({
        id: l.id,
        title: l.title,
        url: l.url,
        imageUrl: l.imageUrl,
        clicks: l.clicks ?? 0,
      })), "links"),
      seo: {
        title: ((seoData as { title?: string } | null)?.title) ?? "",
        description: ((seoData as { description?: string } | null)?.description) ?? "",
      },
      testimonials: curated(rawTestimonials.map((item) => ({
        id: (item.id as string) ?? "",
        author: item.author as string,
        role: (item.role as string) ?? null,
        content: item.content as string,
        avatarUrl: (item.avatarUrl as string) ?? null,
        rating: (item.rating as number) ?? 5,
        featured: (item.featured as boolean) ?? false,
        category: (item.category as string) ?? "general",
      })), "testimonials"),
      faq: rawFaq.map((item) => ({
        id: (item.id as string) ?? "",
        question: item.question as string,
        answer: item.answer as string,
        category: (item.category as string) ?? "general",
      })),
      timeline: curated((timelineEvents ?? []).map((e) => ({
        id: e.id,
        year: e.year,
        title: e.title,
        description: e.description,
        imageUrl: e.imageUrl,
        stats: e.stats,
      })), "timeline"),
      games: curated((gameList ?? []).map((g) => ({
        id: g.id,
        name: g.name,
        logoUrl: g.logoUrl,
        description: g.description,
        genre: g.genre,
      })), "games"),
      contentFeed: curated((feedItems ?? []).map((item) => ({
        id: item.id,
        platform: item.platform,
        mediaType: item.mediaType,
        url: item.url,
        thumbnailUrl: item.thumbnailUrl,
        caption: item.caption,
        permalink: item.permalink,
      })), "contentFeed"),
      courses: curated((offerings ?? [])
        .filter((o) => o.type === "course")
        .map((o) => {
          const meta = o.metadata as Record<string, unknown> | null;
          return {
            id: o.id,
            title: o.title,
            description: o.description,
            price: o.price,
            imageUrl: (meta?.imageUrl as string | undefined) ?? null,
            category: (meta?.category as string | undefined) ?? null,
            featured: (meta?.featured as boolean | undefined) ?? false,
          };
        }), "courses"),
      services: curated((offerings ?? [])
        .filter((o) => o.type === "coaching")
        .map((o) => {
          const meta = o.metadata as Record<string, unknown> | null;
          return {
            id: o.id,
            title: o.title,
            description: o.description,
            price: o.price,
            duration: (meta?.duration as string | undefined) ?? null,
            imageUrl: (meta?.imageUrl as string | undefined) ?? null,
            category: (meta?.category as string | undefined) ?? null,
            featured: (meta?.featured as boolean | undefined) ?? false,
            // RCCF-67.5 — explicit bookable state + its future open slots.
            bookable: o.bookable ?? false,
            bookableSlots: (openBookings ?? [])
              .filter((b) => b.offeringId === o.id)
              .map((b) => ({
                id: b.id,
                slotDate: b.slotDate.toISOString(),
                slotStart: b.slotStart,
                slotEnd: b.slotEnd,
                timezone: b.timezone,
                approvalRequired: b.approvalRequired,
              })),
          };
        }), "services"),
      // RCCF-67.4 — standalone bookable slots (open, future, non-cancelled, NOT
      // tied to a Service). Service-linked availability lives in
      // services[].bookableSlots. Only the public-facing subset is exposed:
      // title/description/price/duration/slot/approval-required. Customer data,
      // notes and approval internals stay out.
      bookings: (openBookings ?? [])
        .filter((b) => !b.offeringId)
        .map((b) => ({
          id: b.id,
          title: b.title,
          description: b.description,
          price: b.price,
          duration: b.duration,
          slotDate: b.slotDate.toISOString(),
          slotStart: b.slotStart,
          slotEnd: b.slotEnd,
          timezone: b.timezone,
          approvalRequired: b.approvalRequired,
        })),
    };

    if (brand?.avatarAssetId || brand?.bannerAssetId) {
      const assetIds: string[] = [];
      const avatarId = brand.avatarAssetId
        ? normalizeAssetId(brand.avatarAssetId, { module: "aggregate.brand", field: "avatarAssetId" })
        : null;
      if (brand.avatarAssetId && !avatarId) recordInvalidAsset(brand.avatarAssetId, "aggregate.brand", "avatarAssetId");
      if (avatarId) assetIds.push(avatarId);

      const bannerId = brand.bannerAssetId
        ? normalizeAssetId(brand.bannerAssetId, { module: "aggregate.brand", field: "bannerAssetId" })
        : null;
      if (brand.bannerAssetId && !bannerId) recordInvalidAsset(brand.bannerAssetId, "aggregate.brand", "bannerAssetId");
      if (bannerId) assetIds.push(bannerId);

      if (assetIds.length > 0) {
        const resolved = await mediaService.resolveUrls(assetIds);
        if (avatarId && resolved[avatarId]) {
          result.identity.avatarUrl = resolved[avatarId];
        } else if (avatarId) {
          if (diagnostics) diagnostics.skippedAssets++;
        }
        if (bannerId && resolved[bannerId]) {
          result.identity.bannerUrl = resolved[bannerId];
        } else if (bannerId) {
          if (diagnostics) diagnostics.skippedAssets++;
        }
      }
    }

    // Hero media: resolve video/poster from their asset ids so the storefront
    // always receives the current storage URL, not a stale baked URL.
    // Asset ids are normalized first — "" or malformed ids are skipped and
    // recorded so the trace reports the exact bad source.
    const rawVideoAssetId = (heroData as Record<string, unknown>)?.videoAssetId as string | null | undefined;
    const rawPosterAssetId = (heroData as Record<string, unknown>)?.posterAssetId as string | null | undefined;
    const videoAssetId = rawVideoAssetId
      ? normalizeAssetId(rawVideoAssetId, { module: "aggregate.hero", field: "videoAssetId" })
      : null;
    const posterAssetId = rawPosterAssetId
      ? normalizeAssetId(rawPosterAssetId, { module: "aggregate.hero", field: "posterAssetId" })
      : null;
    if (rawVideoAssetId && !videoAssetId) recordInvalidAsset(rawVideoAssetId, "aggregate.hero", "videoAssetId");
    if (rawPosterAssetId && !posterAssetId) recordInvalidAsset(rawPosterAssetId, "aggregate.hero", "posterAssetId");

    if (videoAssetId || posterAssetId) {
      const resolved = await mediaService.resolveUrls([videoAssetId, posterAssetId]);
      if (videoAssetId && resolved[videoAssetId]) {
        result.hero.videoUrl = resolved[videoAssetId];
      } else if (videoAssetId) {
        if (diagnostics) diagnostics.skippedAssets++;
      }
      if (posterAssetId && resolved[posterAssetId]) {
        result.hero.posterUrl = resolved[posterAssetId];
      } else if (posterAssetId) {
        if (diagnostics) diagnostics.skippedAssets++;
      }
    }

    // IMPLEMENTATION-21 (BUG 3): resolve hero media ONCE, here, in the runtime
    // pipeline. content.hero carries the resolved decision (resolvedMedia /
    // mediaType / mediaUrl / mediaPoster / rendererDecision) and renderers
    // consume ONLY those fields — never the raw *_Url / *_AssetId values.
    const heroMediaPayload = resolveHeroMediaForRuntime({
      videoUrl: result.hero.videoUrl,
      posterUrl: result.hero.posterUrl,
      backgroundUrl: result.hero.backgroundUrl,
    });
    result.hero.resolvedMedia = heroMediaPayload.resolvedMedia;
    result.hero.mediaType = heroMediaPayload.mediaType;
    result.hero.mediaUrl = heroMediaPayload.mediaUrl;
    result.hero.mediaPoster = heroMediaPayload.mediaPoster;
    result.hero.rendererDecision = heroMediaPayload.rendererDecision;

    // IMPLEMENTATION-20 (Phase D): hero media runtime instrumentation — the
    // decision the renderer will make (video → poster → background →
    // placeholder), plus the exact asset ids + resolved urls. Builder and
    // Storefront both consume this aggregate, so identical values prove parity.
    if (typeof console !== "undefined") {
      const mediaTrace = describeHeroMedia(result.hero);
      console.log("[RuntimeTrace] hero media:", {
        videoAssetId: videoAssetId ?? null,
        videoUrl: result.hero.videoUrl ?? null,
        posterAssetId: posterAssetId ?? null,
        posterUrl: result.hero.posterUrl ?? null,
        backgroundUrl: result.hero.backgroundUrl ?? null,
        resolvedMedia: mediaTrace.resolvedMedia,
        rendererDecision: mediaTrace.rendererDecision,
      });
    }

    return { aggregate: result };
  }

  async buildWithTrace(tenantId: string): Promise<WebsiteAggregate> {
    const agg = await this.build(tenantId);
    if (typeof console !== "undefined") {
      console.log("[RuntimeTrace] Aggregate built:", {
        hero: agg.hero.title ? "present" : "empty",
        products: agg.products.length,
        gallery: agg.gallery.length,
        links: agg.links.length,
        testimonials: agg.testimonials.length,
        faq: agg.faq.length,
        timeline: agg.timeline.length,
        games: agg.games.length,
        contentFeed: agg.contentFeed.length,
        courses: agg.courses.length,
        services: agg.services.length,
        identity: agg.identity.name || "empty",
      });
    }
    return agg;
  }

  /** Resolve the homepage curation limit for a collection key. */
  private limit(key: keyof typeof DEFAULT_HOMEPAGE_LIMITS, options?: AggregateBuildOptions): number {
    return options?.homepageLimit?.[key] ?? DEFAULT_HOMEPAGE_LIMITS[key];
  }

  /**
   * RCCF-IMPLEMENTATION-09B (Phase 6): bounded product load. Homepage mode
   * fetches featured products (capped) plus a non-featured top-up so the query
   * never returns the full catalog; non-homepage loads everything.
   */
  private async loadProducts(tenantId: string, homepage: boolean, options?: AggregateBuildOptions): Promise<Awaited<ReturnType<typeof productRepository.findPublished>>> {
    if (!homepage) return productRepository.findPublished(tenantId);
    const limit = this.limit("products", options);
    const featured = await productRepository.findFeatured(tenantId, { limit });
    const remaining = Math.max(0, limit - featured.length);
    if (remaining === 0) return featured;
    const topUp = await productRepository.findNonFeatured(tenantId, { limit: remaining });
    return [...featured, ...topUp];
  }

  /** Bounded gallery load — featured-first with a non-featured top-up. */
  private async loadGallery(tenantId: string, homepage: boolean, options?: AggregateBuildOptions): Promise<Awaited<ReturnType<typeof galleryRepository.findPublished>>> {
    if (!homepage) return galleryRepository.findPublished(tenantId);
    const limit = this.limit("gallery", options);
    const featured = await galleryRepository.findFeatured(tenantId, { limit });
    const remaining = Math.max(0, limit - featured.length);
    if (remaining === 0) return featured;
    const topUp = await galleryRepository.findNonFeatured(tenantId, { limit: remaining });
    return [...featured, ...topUp];
  }
}

export const websiteAggregateService = new WebsiteAggregateService();
