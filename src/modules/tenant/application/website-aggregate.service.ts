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
import { cache as reactCache } from "react";

const requestCache: <T extends (...args: never[]) => unknown>(fn: T) => T =
  typeof reactCache === "function" ? reactCache : ((fn: unknown) => fn as never);

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

/**
 * RCCF-72.17C.2 — reads shared between the FULL aggregate build and the
 * HOMEPAGE aggregate build. In one request these rows are identical, so a
 * second build can reuse them instead of re-querying (9 fewer round-trips per
 * publish). Preloading is only ever used within the same request; never across
 * requests and never across transaction boundaries.
 */
export interface SharedReads {
  brand: Awaited<ReturnType<typeof brandRepository.findByTenantId>> | null;
  heroData: unknown | null;
  links: Awaited<ReturnType<typeof linkRepository.findPublished>> | null;
  seoData: unknown | null;
  website: Awaited<ReturnType<typeof websiteRepository.findByTenantId>> | null;
  testimonialsData: unknown | null;
  faqData: unknown | null;
  knowledgeCompletion: unknown | null;
  openBookings: Awaited<ReturnType<typeof prisma.booking.findMany>> | null;
  siteSocialLinks: unknown | null;
  footerConfig: unknown | null;
}

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

  /**
   * RCCF-72.17C.2 — full aggregate build that ALSO returns the shared reads so a
   * subsequent homepage build in the same request can reuse them (9 fewer
   * round-trips per publish). Full-build output is byte-identical to
   * `buildWithDiagnostics`; only the extra `sharedReads` is added.
   */
  async buildWithDiagnosticsAndShared(tenantId: string): Promise<{
    aggregate: WebsiteAggregate;
    sharedReads: SharedReads;
    invalidAssetIds: AggregateDiagnostics["invalidAssetIds"];
    skippedAssets: number;
    moduleFailures: string[];
  }> {
    const diagnostics: AggregateDiagnostics = { invalidAssetIds: [], skippedAssets: 0, moduleFailures: [] };
    const { aggregate, sharedReads } = await this.buildWithCollector(tenantId, diagnostics, undefined);
    return {
      aggregate,
      sharedReads,
      invalidAssetIds: diagnostics.invalidAssetIds,
      skippedAssets: diagnostics.skippedAssets,
      moduleFailures: diagnostics.moduleFailures,
    };
  }

  /**
   * RCCF-72.17C.2 — homepage aggregate build reusing the shared reads already
   * loaded by the full build in the same request. Output is identical to
   * `build(tenantId, { homepage: true })`: the collection queries that differ in
   * homepage mode (products/gallery/timeline/games/contentFeed/offerings) still
   * run; only the 9 shared reads are reused. Never call across a request or
   * transaction boundary.
   */
  async buildHomepageFromShared(tenantId: string, sharedReads: SharedReads): Promise<WebsiteAggregate> {
    const { aggregate } = await this.buildWithCollector(tenantId, null, { homepage: true }, sharedReads);
    return aggregate;
  }

  private async buildWithCollector(
    tenantId: string,
    diagnostics: AggregateDiagnostics | null,
    options?: AggregateBuildOptions,
    preload?: SharedReads | null,
  ): Promise<{ aggregate: WebsiteAggregate; sharedReads: SharedReads }> {
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

    // RCCF-72.17C.2 — shared reads are reused when a prior build in the same
    // request already fetched them (identical committed data, no intervening
    // writes). `sharedReads` is returned so the next build can preload them.
    const sharedReads: SharedReads = await this.loadSharedReads(tenantId, diagnostics, preload);
    const { brand, heroData, links, seoData, website, testimonialsData, faqData, knowledgeCompletion, openBookings, siteSocialLinks: siteSocialRaw, footerConfig: footerConfigRaw } = sharedReads;

    const [
      products, gallery, timelineEvents, gameList, feedItems, offerings,
    ] = await Promise.all([
      safe("products", () => this.loadProducts(tenantId, homepage, options)),
      safe("gallery", () => this.loadGallery(tenantId, homepage, options)),
      safe("timeline", () => prisma.timelineEvent.findMany({ where: { tenantId }, orderBy: { year: "desc" }, ...(homepage ? { take: this.limit("timeline") } : {}) })),
      safe("games", () => prisma.game.findMany({ where: { tenantId }, orderBy: { order: "asc" }, ...(homepage ? { take: this.limit("games") } : {}) })),
      safe("contentFeed", () => prisma.contentFeedItem.findMany({
        where: { tenantId, hidden: false },
        orderBy: [{ pinned: "desc" }, { order: "asc" }, { createdAt: "desc" }],
        ...(homepage ? { take: this.limit("contentFeed") } : {}),
      })),
      safe("offerings", () => prisma.offering.findMany({
        where: { tenantId, status: "published", type: { in: ["course", "coaching"] } },
        orderBy: { createdAt: "desc" },
        select: { id: true, type: true, title: true, description: true, price: true, metadata: true, bookable: true },
        ...(homepage ? { take: this.limit("courses") + this.limit("services") } : {}),
      })),
    ]);

    // P1: constrain openBookings to bookable offering IDs (or standalone bookings) — avoids broad scan
    const bookableOfferingIds = new Set((offerings ?? []).filter((o: any) => o.bookable).map((o: any) => o.id));
    const filteredOpenBookings = (openBookings as any[])?.filter((b: any) => !b.offeringId || bookableOfferingIds.has(b.offeringId)) ?? openBookings;

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

    // RCCF-07A — Shared site-level social links (site_social_links) with
    // backward compat fallback to hero_data.socialLinks. Hero CTA links
    // (ctaLink/ctaSecondaryLink) are NEVER used for footer navigation.
    const heroRecord = (heroData as Record<string, unknown>) ?? {};
    const heroSocialLinksLegacy = Array.isArray(heroRecord.socialLinks)
      ? (heroRecord.socialLinks as Array<{ platform: string; url: string; label?: string }>)
      : [];
    const siteSocialLinksRaw = Array.isArray(siteSocialRaw) ? (siteSocialRaw as Array<{ platform: string; url: string; label?: string }>) : [];
    const effectiveSocialLinks = siteSocialLinksRaw.length > 0 ? siteSocialLinksRaw : heroSocialLinksLegacy;
    const heroBio = (heroRecord.bio as string) ?? "";
    const heroName = (heroRecord.name as string) ?? "";
    const heroProfilePictureUrl = (heroRecord.profilePictureUrl as string) ?? "";

    // RCCF-66.2: server-authoritative WhatsApp destination from the SHARED
    // site social links (not Hero CTA). Resolved ONCE here and baked
    // into every product so the storefront never needs a live read.
    const whatsappDestination = resolveWhatsAppDestination(effectiveSocialLinks);

    // RCCF-07A — Footer-owned configuration (footer_config). Optional for compat.
    const footerRaw = (footerConfigRaw as Record<string, unknown> | null) ?? null;
    const footerColumnsRaw = Array.isArray((footerRaw as Record<string, unknown> | null)?.columns) ? ((footerRaw as Record<string, unknown>).columns as unknown[]) : null;
    const footerColumns = (() => {
      if (!footerColumnsRaw || footerColumnsRaw.length === 0) return undefined;
      const cols = (footerColumnsRaw as Array<{ title: string; links: Array<{ label: string; href: string }> }>).filter((c) => c.title && Array.isArray(c.links)).map((c)=> ({ title: String(c.title), links: c.links.filter((l)=> l.label && l.href).map((l)=> ({ label:String(l.label), href:String(l.href)}))})).filter((c)=>c.links.length>0);
      return cols.length>0 ? cols : undefined;
    })();

    const result: WebsiteAggregate = {
      identity: {
        name: (heroName || brand?.name) ?? website?.tenant?.name ?? "",
        tagline: ((heroRecord.tagline as string) || brand?.tagline) ?? "",
        bio: (heroBio || brand?.bio) ?? "",
        avatarUrl: (heroProfilePictureUrl || brand?.avatarUrl) ?? null,
        bannerUrl: brand?.bannerUrl ?? null,
        socialLinks: effectiveSocialLinks.length > 0
          ? effectiveSocialLinks
          : ((brand?.socialLinks as Array<{ platform: string; url: string }>) ?? []),
      },
      // RCCF-07A — shared site social links (site_social_links) with hero fallback
      siteSocialLinks: effectiveSocialLinks,
      // RCCF-07A — footer-owned configuration
      footer: {
        description: (footerRaw?.description as string | null) ?? null,
        copyright: (footerRaw?.copyright as string | null) ?? null,
        columns: footerColumns ?? [],
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
        socialLinks: effectiveSocialLinks,
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
            bookableSlots: (filteredOpenBookings ?? [])
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
      bookings: (filteredOpenBookings ?? [])
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

    // Hero media: resolve video/poster/background from their asset ids so the
    // storefront always receives the current storage URL, not a stale baked URL.
    // Asset ids are normalized first — "" or malformed ids are skipped and
    // recorded so the trace reports the exact bad source.
    const rawVideoAssetId = (heroData as Record<string, unknown>)?.videoAssetId as string | null | undefined;
    const rawPosterAssetId = (heroData as Record<string, unknown>)?.posterAssetId as string | null | undefined;
    const rawBackgroundAssetId = (heroData as Record<string, unknown>)?.backgroundAssetId as string | null | undefined;
    const videoAssetId = rawVideoAssetId
      ? normalizeAssetId(rawVideoAssetId, { module: "aggregate.hero", field: "videoAssetId" })
      : null;
    const posterAssetId = rawPosterAssetId
      ? normalizeAssetId(rawPosterAssetId, { module: "aggregate.hero", field: "posterAssetId" })
      : null;
    const backgroundAssetId = rawBackgroundAssetId
      ? normalizeAssetId(rawBackgroundAssetId, { module: "aggregate.hero", field: "backgroundAssetId" })
      : null;
    if (rawVideoAssetId && !videoAssetId) recordInvalidAsset(rawVideoAssetId, "aggregate.hero", "videoAssetId");
    if (rawPosterAssetId && !posterAssetId) recordInvalidAsset(rawPosterAssetId, "aggregate.hero", "posterAssetId");
    if (rawBackgroundAssetId && !backgroundAssetId) recordInvalidAsset(rawBackgroundAssetId, "aggregate.hero", "backgroundAssetId");

    if (videoAssetId || posterAssetId || backgroundAssetId) {
      const resolved = await mediaService.resolveUrls([videoAssetId, posterAssetId, backgroundAssetId]);
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
      if (backgroundAssetId && resolved[backgroundAssetId]) {
        result.hero.backgroundUrl = resolved[backgroundAssetId];
      } else if (backgroundAssetId) {
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

    return { aggregate: result, sharedReads };
  }

  /**
   * RCCF-72.17C.2 — load the reads shared between the full and homepage builds.
   * Reuses a preloaded set when available (same request, same committed rows);
   * otherwise issues the query. `safe()` preserves per-module failure capture.
   */
  private async loadSharedReads(
    tenantId: string,
    diagnostics: AggregateDiagnostics | null,
    preload?: SharedReads | null,
  ): Promise<SharedReads> {
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
    const use = <T>(key: keyof SharedReads, name: string, fn: () => Promise<T>): Promise<T | null> =>
      preload && preload[key] !== undefined ? Promise.resolve(preload[key] as T | null) : safe(name, fn);

    return {
      brand: await use("brand", "brand", () => brandRepository.findByTenantId(tenantId)),
      heroData: await use("heroData", "hero", () => SettingsService.getHeroData(tenantId)),
      links: await use("links", "links", () => linkRepository.findPublished(tenantId)),
      seoData: await use("seoData", "seo", () => SettingsService.getSeo(tenantId)),
      website: await use("website", "website", () => websiteRepository.findByTenantId(tenantId)),
      testimonialsData: await use("testimonialsData", "testimonials", () => SettingsService.getSettingByKey(tenantId, "testimonials")),
      faqData: await use("faqData", "faq", () => SettingsService.getSettingByKey(tenantId, "faq")),
      knowledgeCompletion: await use("knowledgeCompletion", "knowledgeCompletion", () => SettingsService.getSettingByKey(tenantId, "knowledge_completion")),
      openBookings: await use("openBookings", "openBookings", () => prisma.booking.findMany({
        where: { tenantId, customerEmail: null, status: { not: "cancelled" }, slotDate: { gte: new Date() } },
        orderBy: { slotDate: "asc" },
      })),
      siteSocialLinks: await use("siteSocialLinks", "siteSocialLinks", () => SettingsService.getSettingByKey(tenantId, "site_social_links")),
      footerConfig: await use("footerConfig", "footerConfig", () => SettingsService.getSettingByKey(tenantId, "footer_config")),
    };
  }

  // P0: request-level dedup — shared reads reused across Dashboard/Knowledge/Health within same request
  getSharedReads = requestCache(async (tenantId: string): Promise<SharedReads> => {
    return this.loadSharedReads(tenantId, null, null);
  });

  // P0: booking total count dedup (dashboard + knowledge)
  getBookingCount = requestCache(async (tenantId: string): Promise<number> => {
    return prisma.booking.count({ where: { tenantId } });
  });

  // P0: tenant subdomain/customDomain dedup
  getTenantMeta = requestCache(async (tenantId: string) => {
    return prisma.tenant.findUnique({ where: { id: tenantId }, select: { subdomain: true, customDomain: true } });
  });

  // P0: website id/theme dedup
  getWebsite = requestCache(async (tenantId: string) => {
    return prisma.website.findUnique({ where: { tenantId }, select: { id: true, themePackageId: true } });
  });

  // P1: order counts dedup — same metric across dashboard/health/goal
  getOrderCountCompleted = requestCache(async (tenantId: string) => {
    return prisma.productOrder.count({ where: { tenantId, status: "COMPLETED" } });
  });

  getOrderCountPaidCompleted = requestCache(async (tenantId: string) => {
    return prisma.productOrder.count({ where: { tenantId, status: { in: ["PAID", "COMPLETED"] } } });
  });

  // P1: product counts consolidated — 3× count → 1× filtered aggregate
  getProductCounts = requestCache(async (tenantId: string): Promise<{ total: number; published: number; active: number }> => {
    try {
      const result = await prisma.$queryRaw<{ total: number; published: number; active: number }[]>`
        SELECT
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE status = 'PUBLISHED')::int as published,
          COUNT(*) FILTER (WHERE "isActive" = true)::int as active
        FROM "Product" WHERE "tenantId" = ${tenantId}::uuid
      `;
      const row = result[0] as any;
      return { total: Number(row.total), published: Number(row.published), active: Number(row.active) };
    } catch {
      // Fallback for test env where $queryRaw not mocked — preserve semantics
      const [total, published, active] = await Promise.all([
        prisma.product.count({ where: { tenantId } }),
        prisma.product.count({ where: { tenantId, status: "PUBLISHED" } }),
        prisma.product.count({ where: { tenantId, isActive: true } }),
      ]);
      return { total, published, active };
    }
  });

  // P0: build with preloaded shared reads to avoid duplicate loadSharedReads
  async buildWithSharedReads(tenantId: string, sharedReads: SharedReads): Promise<WebsiteAggregate> {
    const { aggregate } = await this.buildWithCollector(tenantId, null, undefined, sharedReads);
    return aggregate;
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
