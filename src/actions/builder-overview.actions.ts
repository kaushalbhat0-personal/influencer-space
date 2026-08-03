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
  healthScore: number;
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

    const healthScore = calculateHealthScore({
      products: productCount,
      gallery: galleryCount,
      testimonials: testimonialsList,
      faq: faqList,
      timeline: timelineCount,
      games: gameCount,
      contentFeed: feedCount,
      links: linkCount,
      heroConfigured,
      seoConfigured,
      profileComplete,
      customDomain: !!tenant.customDomain,
      pages: pageCount,
      navigationConfigured: navItems.length > 0,
    });

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
          ? { plan: planDisplay, status: planResolved.status ?? "ACTIVE" }
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
        healthScore,
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

export interface HealthCategory {
  id: string;
  label: string;
  score: number;
  maxScore: number;
  issues: string[];
}

export async function getBuilderHealth(): Promise<{
  success: boolean;
  data?: {
    overallScore: number;
    categories: HealthCategory[];
    topRecommendations: { id: string; label: string; action: string; href: string }[];
  };
  error?: string;
}> {
  try {
    const { tenant, website, tenantId } = await getTenantAndWebsite();

    const [
      brand,
      productCount,
      galleryCount,
      timelineCount,
      _gameCount,
      feedCount,
      linkCount,
      navSetting,
      testimonialSetting,
      faqSetting,
      heroSetting,
      seoSetting,
    ] = await Promise.all([
      prisma.brand.findUnique({ where: { websiteId: website.id } }),
      prisma.product.count({ where: { tenantId, status: "PUBLISHED", isActive: true, archivedAt: null } }),
      prisma.galleryImage.count({ where: { tenantId, status: "PUBLISHED", isActive: true, archivedAt: null } }),
      prisma.timelineEvent.count({ where: { tenantId } }),
      prisma.game.count({ where: { tenantId, isActive: true } }),
      prisma.contentFeedItem.count({ where: { tenantId, hidden: false } }),
      prisma.affiliateLink.count({ where: { tenantId, isActive: true } }),
      prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "navigation" } } }),
      prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "testimonials" } } }),
      prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "faq" } } }),
      prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "hero" } } }),
      prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "seo" } } }),
    ]);

    const testimonialsCount = testimonialSetting?.value && Array.isArray(testimonialSetting.value)
      ? testimonialSetting.value.length : 0;
    const faqCount = faqSetting?.value && Array.isArray(faqSetting.value)
      ? faqSetting.value.length : 0;
    const heroConfigured = heroSetting?.value && typeof heroSetting.value === "object" && Object.keys(heroSetting.value as object).length > 0;
    const seoVal = seoSetting?.value as Record<string, unknown> | null;
    const seoConfigured = seoVal !== null && (!!seoVal.title || !!seoVal.description);
    const profileComplete = !!(brand?.name && brand?.tagline);
    const navItems = navSetting?.value && Array.isArray(navSetting.value) ? navSetting.value : [];
    const hasDomain = !!tenant.customDomain;

    const categories: HealthCategory[] = [
      {
        id: "profile", label: "Profile", score: profileComplete ? 10 : 0, maxScore: 10,
        issues: profileComplete ? [] : ["Complete your profile"],
      },
      {
        id: "content", label: "Content", score: 0, maxScore: 20,
        issues: [],
      },
      {
        id: "store", label: "Store", score: productCount > 0 ? 15 : 0, maxScore: 15,
        issues: productCount > 0 ? [] : ["No products"],
      },
      {
        id: "marketing", label: "Marketing", score: 0, maxScore: 15,
        issues: [],
      },
      {
        id: "platform", label: "Platform", score: hasDomain ? 10 : 0, maxScore: 10,
        issues: hasDomain ? [] : ["Connect a custom domain"],
      },
      {
        id: "design", label: "Design", score: (heroConfigured ? 5 : 0) + (!!website.themePackageId ? 5 : 0), maxScore: 10,
        issues: heroConfigured ? [] : ["Configure hero section"],
      },
    ];

    const contentScore = (galleryCount > 0 ? 4 : 0) + (testimonialsCount > 0 ? 4 : 0) +
      (faqCount > 0 ? 4 : 0) + (timelineCount > 0 ? 4 : 0) + (feedCount > 0 ? 4 : 0);
    categories[1]!.score = Math.min(contentScore, 20);
    if (galleryCount === 0) categories[1]!.issues.push("No gallery images");
    if (testimonialsCount === 0) categories[1]!.issues.push("No testimonials");
    if (faqCount === 0) categories[1]!.issues.push("No FAQ");
    if (timelineCount === 0) categories[1]!.issues.push("No timeline events");

    const marketingScore = (linkCount > 0 ? 5 : 0) + (navItems.length > 0 ? 5 : 0) + (seoConfigured ? 5 : 0);
    categories[3]!.score = marketingScore;
    if (linkCount === 0) categories[3]!.issues.push("No links");
    if (navItems.length === 0) categories[3]!.issues.push("No navigation");
    if (!seoConfigured) categories[3]!.issues.push("Missing SEO");

    const overallScore = Math.round(
      categories.reduce((sum, c) => sum + c.score, 0) /
      categories.reduce((sum, c) => sum + c.maxScore, 0) * 100
    );

    const topRecommendations: { id: string; label: string; action: string; href: string }[] = [];

    if (productCount === 0) topRecommendations.push({ id: "products", label: "Missing Products", action: "Add Products", href: "/admin/products" });
    if (galleryCount === 0) topRecommendations.push({ id: "gallery", label: "Missing Gallery", action: "Upload Images", href: "/admin/gallery" });
    if (testimonialsCount === 0) topRecommendations.push({ id: "testimonials", label: "Missing Testimonials", action: "Add Testimonials", href: "/admin/testimonials" });
    if (faqCount === 0) topRecommendations.push({ id: "faq", label: "Missing FAQ", action: "Add FAQ", href: "/admin/faq" });
    if (!heroConfigured) topRecommendations.push({ id: "hero", label: "Missing Hero", action: "Configure Hero", href: "/admin/settings" });
    if (!seoConfigured) topRecommendations.push({ id: "seo", label: "Missing SEO", action: "Complete SEO", href: "/admin/seo" });
    if (!hasDomain) topRecommendations.push({ id: "domain", label: "Connect Domain", action: "Connect Domain", href: "/admin/settings/domain" });
    if (!profileComplete) topRecommendations.push({ id: "profile", label: "Complete Profile", action: "Complete Profile", href: "/admin/profile" });

    return {
      success: true,
      data: {
        overallScore,
        categories,
        topRecommendations: topRecommendations.slice(0, 5),
      },
    };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

function calculateHealthScore(params: {
  products: number; gallery: number; testimonials: number; faq: number;
  timeline: number; games: number; contentFeed: number; links: number;
  heroConfigured: boolean; seoConfigured: boolean; profileComplete: boolean;
  customDomain: boolean; pages: number; navigationConfigured: boolean;
}): number {
  let score = 0;
  let maxScore = 0;

  score += params.profileComplete ? 10 : 0; maxScore += 10;
  score += params.heroConfigured ? 10 : 0; maxScore += 10;
  score += params.products > 0 ? 15 : 0; maxScore += 15;
  score += params.gallery > 0 ? 10 : 0; maxScore += 10;
  score += params.testimonials > 0 ? 10 : 0; maxScore += 10;
  score += params.faq > 0 ? 10 : 0; maxScore += 10;
  score += params.timeline > 0 ? 5 : 0; maxScore += 5;
  score += params.links > 0 ? 5 : 0; maxScore += 5;
  score += params.seoConfigured ? 10 : 0; maxScore += 10;
  score += params.customDomain ? 10 : 0; maxScore += 10;
  score += params.navigationConfigured ? 5 : 0; maxScore += 5;

  return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
}
