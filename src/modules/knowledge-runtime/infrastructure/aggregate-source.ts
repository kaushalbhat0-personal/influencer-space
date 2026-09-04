// ── Knowledge Snapshot Source ───────────────────────────────
// Builds the flattened KnowledgeSnapshot from the canonical WebsiteAggregate
// plus a small number of direct reads (tenant, account_data, influencer_data,
// knowledge_completion, theme colors, bookings). The snapshot is the ONLY
// input the registry/analyzers read, keeping the whole runtime pure and
// deterministic. Any module failure degrades to empty, never throws.

import { prisma } from "@/lib/prisma";
import { websiteAggregateService } from "@/modules/tenant/application/website-aggregate.service";
import type { WebsiteAggregate } from "@/types/snapshot";
import { resolvePack } from "../domain/category-packs";
import type { KnowledgeSnapshot } from "../domain/types";

function getUnstableCache(): typeof import("next/cache").unstable_cache | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("next/cache") as { unstable_cache?: typeof import("next/cache").unstable_cache };
    return typeof mod.unstable_cache === "function" ? mod.unstable_cache : null;
  } catch {
    return null;
  }
}

const safe = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await fn();
  } catch {
    return fallback;
  }
};

export class KnowledgeAggregateSource {
  async buildSnapshot(tenantId: string): Promise<KnowledgeSnapshot> {
    // 01G-01F-A: persistent tenant-aggregate cache for the safe core (aggregate + tenant + settings).
    // bookingCount stays request-fresh (customer-driven, not via afterContentChange) and billing is outside.
    const core = await this.getCachedCore(tenantId);
    const bookingCount = await safe(() => websiteAggregateService.getBookingCount(tenantId), 0);
    // Handle serialized Date values safely (unstable_cache JSON stringifies Dates)
    const aggregate = core.aggregate as unknown as WebsiteAggregate | null;
    // Revive any stringified Dates in sharedReads openBookings if present (defensive)
    if (core.sharedReads?.openBookings) {
      for (const b of core.sharedReads.openBookings as unknown as Array<{ slotDate?: unknown }>) {
        if (typeof b.slotDate === "string") {
          try {
            (b as unknown as { slotDate: Date }).slotDate = new Date(b.slotDate as string);
          } catch {
            // keep string, toSnapshot handles via new Date
          }
        }
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const completionRecord = core.sharedReads?.knowledgeCompletion ? { value: core.sharedReads.knowledgeCompletion } as unknown as { value: unknown } : null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const website = core.sharedReads?.website ? { themeColors: (core.sharedReads.website as unknown as { themeColors: unknown }).themeColors } as unknown as { themeColors: unknown } : null;

    return this.toSnapshot(aggregate, {
      subdomain: core.tenant?.subdomain ?? null,
      customDomain: core.tenant?.customDomain ?? null,
      account: (core.accountRecord?.value ?? {}) as Record<string, unknown>,
      influencer: (core.influencerRecord?.value ?? {}) as Record<string, unknown>,
      completion: (completionRecord?.value ?? {}) as Record<string, unknown>,
      customTheme: Boolean(
        website?.themeColors && Object.keys(website.themeColors as Record<string, unknown>).length > 0,
      ),
      bookingCount: bookingCount ?? 0,
    });
  }

  private async getCachedCore(tenantId: string): Promise<{
    aggregate: WebsiteAggregate | null;
    tenant: { subdomain: string | null; customDomain: string | null } | null;
    accountRecord: { value: unknown } | null;
    influencerRecord: { value: unknown } | null;
    sharedReads: Awaited<ReturnType<typeof websiteAggregateService.getSharedReads>> | null;
  }> {
    const uc = getUnstableCache();
    if (!uc) {
      return this.buildCoreUncached(tenantId);
    }
    try {
      const cached = uc(
        async (tid: string) => this.buildCoreUncached(tid),
        ["tenant-aggregate-knowledge-core", tenantId],
        { tags: [`tenant-aggregate:${tenantId}`] },
      );
      return await cached(tenantId);
    } catch {
      return this.buildCoreUncached(tenantId);
    }
  }

  private async buildCoreUncached(tenantId: string): Promise<{
    aggregate: WebsiteAggregate | null;
    tenant: { subdomain: string | null; customDomain: string | null } | null;
    accountRecord: { value: unknown } | null;
    influencerRecord: { value: unknown } | null;
    sharedReads: Awaited<ReturnType<typeof websiteAggregateService.getSharedReads>> | null;
  }> {
    const sharedReadsPromise = websiteAggregateService.getSharedReads(tenantId).catch(() => null);
    const [aggregate, tenant, accountRecord, influencerRecord, sharedReads] = await Promise.all([
      safe(() => websiteAggregateService.build(tenantId), null),
      safe(() => websiteAggregateService.getTenantMeta(tenantId), null),
      safe(() => prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "account_data" } } }), null),
      safe(() => prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "influencer_data" } } }), null),
      safe(() => sharedReadsPromise, null),
    ]);
    return { aggregate, tenant, accountRecord, influencerRecord, sharedReads };
  }

  private toSnapshot(
    aggregate: WebsiteAggregate | null,
    meta: {
      subdomain: string | null;
      customDomain: string | null;
      account: Record<string, unknown>;
      influencer: Record<string, unknown>;
      completion: Record<string, unknown>;
      customTheme: boolean;
      bookingCount: number;
    },
  ): KnowledgeSnapshot {
    const aggregateSafe: WebsiteAggregate | null = aggregate;
    const identity = aggregateSafe?.identity;
    const hero = aggregateSafe?.hero;
    const products = aggregateSafe?.products ?? [];
    const gallery = aggregateSafe?.gallery ?? [];
    const declarations = (meta.completion.facts as Record<string, unknown> | undefined) ?? {};

    const account = meta.account;
    const influencer = meta.influencer;
    const sourcePlatform = (influencer.source as string) || "";
    const declaredPrimaryPlatform = declarations.social_primary_platform;
    const declaredLanguages = Array.isArray(declarations.contact_languages)
      ? declarations.contact_languages as string[]
      : [];

    const resolvedMedia = hero?.resolvedMedia;
    const heroMediaPresent = Boolean(
      resolvedMedia && resolvedMedia !== "placeholder" ||
      hero?.videoUrl || hero?.backgroundUrl || hero?.imageUrl || hero?.posterUrl,
    );

    return {
      identity: {
        name: identity?.name ?? "",
        tagline: identity?.tagline ?? "",
        bio: identity?.bio ?? "",
        avatarUrl: identity?.avatarUrl ?? null,
        bannerUrl: identity?.bannerUrl ?? null,
      },
      brand: {
        logoUrl: identity?.avatarUrl ?? null,
        customTheme: meta.customTheme,
      },
      commerce: {
        productCount: products.length,
        productsWithDescription: products.filter((p) => Boolean(p.description)).length,
        productsWithImage: products.filter((p) => Boolean(p.imageUrl) || (p.images?.length ?? 0) > 0).length,
        offersPriced: products.filter((p) => p.price > 0).length,
        offerCount: products.length + (aggregateSafe?.services.length ?? 0) + (aggregateSafe?.courses.length ?? 0),
        serviceCount: aggregateSafe?.services.length ?? 0,
        courseCount: aggregateSafe?.courses.length ?? 0,
        bookingCount: meta.bookingCount,
      },
      content: {
        galleryCount: gallery.length,
        galleryWithTitle: gallery.filter((g) => Boolean(g.title)).length,
        galleryWithAltText: gallery.filter((g) => Boolean(g.altText)).length,
        faqCount: aggregateSafe?.faq.length ?? 0,
        feedCount: aggregateSafe?.contentFeed.length ?? 0,
      },
      trust: {
        testimonialCount: aggregateSafe?.testimonials.length ?? 0,
        timelineCount: aggregateSafe?.timeline.length ?? 0,
        gameCount: aggregateSafe?.games.length ?? 0,
      },
      media: {
        heroMediaPresent,
        heroTitlePresent: Boolean(hero?.title || hero?.name),
      },
      seo: {
        title: aggregateSafe?.seo.title ?? "",
        description: aggregateSafe?.seo.description ?? "",
      },
      contact: {
        email: (account.contactEmail as string) ?? "",
        phone: (account.phone as string) ?? "",
        location: (account.location as string) ?? "",
        languages: declaredLanguages.length > 0
          ? declaredLanguages
          : typeof account.language === "string" && account.language.length > 0
            ? [account.language]
            : [],
        businessHours: Array.isArray(declarations.business_hours)
          ? declarations.business_hours as string[]
          : typeof declarations.business_hours === "string" && declarations.business_hours.length > 0
            ? [declarations.business_hours]
            : [],
      },
      social: {
        socialLinkCount: identity?.socialLinks.length ?? 0,
        primaryPlatform:
          typeof declaredPrimaryPlatform === "string" && declaredPrimaryPlatform.length > 0
            ? declaredPrimaryPlatform
            : sourcePlatform,
        feedConnected: (aggregateSafe?.contentFeed.length ?? 0) > 0,
        affiliateLinkCount: aggregateSafe?.links.length ?? 0,
      },
      business: {
        customDomain: meta.customDomain,
        subdomain: meta.subdomain,
      },
      declared: declarations,
      entityType: resolvePack((influencer.niche as string) || "").id,
    };
  }
}

export const knowledgeAggregateSource = new KnowledgeAggregateSource();
