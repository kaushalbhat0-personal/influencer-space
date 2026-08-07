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

const safe = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await fn();
  } catch {
    return fallback;
  }
};

export class KnowledgeAggregateSource {
  async buildSnapshot(tenantId: string): Promise<KnowledgeSnapshot> {
    const [aggregate, tenant, accountRecord, influencerRecord, completionRecord, website, bookingCount] =
      await Promise.all([
        safe(() => websiteAggregateService.build(tenantId), null),
        safe(() => prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { subdomain: true, customDomain: true },
        }), null),
        safe(() => prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "account_data" } } }), null),
        safe(() => prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "influencer_data" } } }), null),
        safe(() => prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "knowledge_completion" } } }), null),
        safe(() => prisma.website.findUnique({ where: { tenantId }, select: { themeColors: true } }), null),
        safe(() => prisma.booking.count({ where: { tenantId } }), 0),
      ]);

    return this.toSnapshot(aggregate, {
      subdomain: tenant?.subdomain ?? null,
      customDomain: tenant?.customDomain ?? null,
      account: (accountRecord?.value ?? {}) as Record<string, unknown>,
      influencer: (influencerRecord?.value ?? {}) as Record<string, unknown>,
      completion: (completionRecord?.value ?? {}) as Record<string, unknown>,
      customTheme: Boolean(
        website?.themeColors && Object.keys(website.themeColors as Record<string, unknown>).length > 0,
      ),
      bookingCount: bookingCount ?? 0,
    });
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
