"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveActivePlan } from "@/modules/billing/application/plan-source";
import { resolvePlan } from "@/lib/capabilities/plan-resolution";

export interface BuilderOverviewData {
  website: {
    id: string;
    name: string;
    themePackageId: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  tenant: {
    id: string;
    name: string;
    subdomain: string | null;
    customDomain: string | null;
  };
  subscription: {
    plan: string | null;
    /** RCCF-LAUNCH-TRACK-06: canonical plan CODE (not display name) so the
     * builder theme picker can resolve entitlement via the Capability Runtime. */
    code: string | null;
    status: string | null;
  } | null;
  brand: {
    name: string | null;
    tagline: string | null;
    avatarUrl: string | null;
  } | null;
  publishStatus: {
    state: string;
    liveVersion: number | null;
    publishedAt: Date | null;
  } | null;
  contentCounts: {
    products: number;
    gallery: number;
    testimonials: number;
    faq: number;
    timeline: number;
    games: number;
    contentFeed: number;
    links: number;
    media: number;
    navigation: number;
    pages: number;
    sections: number;
  };
  storageUsed: number;
  lastSavedAt: Date | null;
  blueprint: {
    id: string | null;
    name: string | null;
  };
  navigationConfigured: boolean;
  profileComplete: boolean;
  heroConfigured: boolean;
  seoConfigured: boolean;
  themeConfigured: boolean;
}

async function getTenantAndWebsite() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) throw new Error("Unauthorized");
  const tenantId = session.user.tenantId;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      subdomain: true,
      customDomain: true,
    },
  });
  if (!tenant) throw new Error("Tenant not found");

  const website = await prisma.website.findUnique({
    where: { tenantId },
    select: {
      id: true,
      themePackageId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!website) throw new Error("Website not found");

  return { tenant, website, tenantId, websiteId: website.id };
}

export async function getBuilderOverview(): Promise<{
  success: boolean;
  data?: BuilderOverviewData;
  error?: string;
}> {
  try {
    const { tenant, website, tenantId, websiteId } = await getTenantAndWebsite();

    const [
      brand,
      planResolved,
      publishStatus,
      productCount,
      galleryCount,
      timelineCount,
      gameCount,
      feedCount,
      linkCount,
      mediaCount,
      pageCount,
      navigationSetting,
      testimonialSetting,
      faqSetting,
      heroSetting,
      seoSetting,
    ] = await Promise.all([
      prisma.brand.findUnique({ where: { websiteId } }),
      resolveActivePlan(undefined, tenantId),
      prisma.publishStatus.findUnique({ where: { websiteId } }),
      prisma.product.count({ where: { tenantId, status: "PUBLISHED", isActive: true, archivedAt: null } }),
      prisma.galleryImage.count({ where: { tenantId, status: "PUBLISHED", isActive: true, archivedAt: null } }),
      prisma.timelineEvent.count({ where: { tenantId } }),
      prisma.game.count({ where: { tenantId, isActive: true } }),
      prisma.contentFeedItem.count({ where: { tenantId, hidden: false } }),
      prisma.affiliateLink.count({ where: { tenantId, isActive: true } }),
      prisma.asset.count({ where: { tenantId, status: { not: "DELETED" } } }),
      prisma.page.count({ where: { websiteId } }),
      prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "navigation" } } }),
      prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "testimonials" } } }),
      prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "faq" } } }),
      prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "hero" } } }),
      prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "seo" } } }),
    ]);

    const testimonialsList = testimonialSetting?.value && Array.isArray(testimonialSetting.value)
      ? testimonialSetting.value.length
      : 0;
    const faqList = faqSetting?.value && Array.isArray(faqSetting.value)
      ? faqSetting.value.length
      : 0;

    const navItems = navigationSetting?.value && Array.isArray(navigationSetting.value)
      ? navigationSetting.value
      : [];

    const pages = await prisma.page.findMany({ where: { websiteId }, select: { id: true, _count: { select: { sections: true } } } });
    const totalSections = pages.reduce((acc, p) => acc + p._count.sections, 0);

    const heroVal = heroSetting?.value as Record<string, unknown> | null;
    // Note: heroSetting?.value is `undefined` when the "hero" setting is
    // absent (the app stores hero under "hero_data"). A loose `!= null` guard
    // catches both null and undefined so Object.keys() never throws.
    const heroConfigured = heroVal != null && Object.keys(heroVal).length > 0;

    const seoVal = seoSetting?.value as Record<string, unknown> | null;
    const seoConfigured = seoVal != null && (!!seoVal.title || !!seoVal.description);

    const profileComplete = !!(brand?.name && brand?.tagline);

    const storageUsed = await prisma.asset.aggregate({
      where: { tenantId, status: { not: "DELETED" } },
      _sum: { size: true },
    }).then((r) => r._sum.size ?? 0);

    const planCode = planResolved.code;
    const planDisplay = planCode ? resolvePlan(planCode).displayName : "Free";

    return {
      success: true,
      data: {
        website: {
          id: websiteId,
          name: brand?.name ?? tenant.name,
          themePackageId: website.themePackageId,
          createdAt: website.createdAt,
          updatedAt: website.updatedAt,
        },
        tenant: {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain,
          customDomain: tenant.customDomain,
        },
        subscription: planResolved.code
          ? { plan: planDisplay, code: planResolved.code, status: planResolved.status ?? "ACTIVE" }
          : null,
        brand: brand ? { name: brand.name, tagline: brand.tagline, avatarUrl: brand.avatarUrl } : null,
        publishStatus: publishStatus
          ? { state: publishStatus.state, liveVersion: publishStatus.liveVersion, publishedAt: publishStatus.publishedAt }
          : null,
        contentCounts: {
          products: productCount,
          gallery: galleryCount,
          testimonials: testimonialsList,
          faq: faqList,
          timeline: timelineCount,
          games: gameCount,
          contentFeed: feedCount,
          links: linkCount,
          media: mediaCount,
          navigation: navItems.length,
          pages: pageCount,
          sections: totalSections,
        },
        storageUsed: Number(storageUsed),
        lastSavedAt: navItems.length > 0 ? new Date() : website.updatedAt,
        blueprint: {
          id: null,
          name: null,
        },
        navigationConfigured: navItems.length > 0,
        profileComplete,
        heroConfigured,
        seoConfigured,
        themeConfigured: !!website.themePackageId,
      },
    };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
