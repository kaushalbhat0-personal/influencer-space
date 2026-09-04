import { prisma } from "@/lib/prisma";
import { cache as reactCache } from "react";
import { websiteAggregateService } from "@/modules/tenant/application/website-aggregate.service";

// VALIDATION-05: request-scoped memoization — the same convention as the
// Runtime Context builder. evaluate() is called by the tenant page, dashboard,
// builder and the context builder; without this it ran its 13 queries once per
// caller within the same request.
const requestCache: <T extends (...args: never[]) => unknown>(fn: T) => T =
  typeof reactCache === "function" ? reactCache : ((fn: (x: never) => unknown) => fn as never);

export interface HealthCheck {
  id: string;
  label: string;
  description: string;
  score: number; // 0-100
  done: boolean;
  href: string;
  category: "brand" | "content" | "commerce" | "seo" | "social" | "design" | "platform";
  weight: number; // relative importance for overall score
}

export interface HealthReport {
  overallScore: number;
  checks: HealthCheck[];
  categoryScores: Record<string, number>;
  topRecommendations: HealthCheck[];
}

export class WebsiteHealthEngine {
  evaluate = requestCache(async (tenantId: string): Promise<HealthReport> => {
    const checks = await this.runChecks(tenantId);

    const overallScore = this.computeOverall(checks);
    const categoryScores = this.computeCategoryScores(checks);
    const topRecommendations = checks
      .filter((c) => !c.done)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5);

    return { overallScore, checks, categoryScores, topRecommendations };
  });

  private async runChecks(tenantId: string): Promise<HealthCheck[]> {
    // P0: reuse request-cached SharedReads for brand/hero/links/seo/website/testimonials etc.
    const sharedReads = await websiteAggregateService.getSharedReads(tenantId).catch(() => null);
    const [
      brand,
      productCount,
      galleryCount,
      linkCount,
      timelineCount,
      testimonialSetting,
      faqSetting,
      feedCount,
      gameCount,
      seoSetting,
      website,
      publishStatus,
      orderCount,
    ] = await Promise.all([
      sharedReads?.brand ? Promise.resolve(sharedReads.brand as any) : prisma.brand.findFirst({
        where: { website: { tenantId } },
        select: { name: true, tagline: true, bio: true, avatarUrl: true },
      }),
      prisma.product.count({ where: { tenantId, status: "PUBLISHED", isActive: true, archivedAt: null } }),
      prisma.galleryImage.count({ where: { tenantId, status: "PUBLISHED", isActive: true } }),
      prisma.affiliateLink.count({ where: { tenantId, isActive: true } }),
      prisma.timelineEvent.count({ where: { tenantId } }),
      sharedReads?.testimonialsData !== undefined && sharedReads?.testimonialsData !== null
        ? Promise.resolve({ value: sharedReads.testimonialsData } as any)
        : prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "testimonials" } } }),
      sharedReads?.faqData !== undefined && sharedReads?.faqData !== null
        ? Promise.resolve({ value: sharedReads.faqData } as any)
        : prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "faq" } } }),
      prisma.contentFeedItem.count({ where: { tenantId, hidden: false } }),
      prisma.game.count({ where: { tenantId, isActive: true } }),
      sharedReads?.seoData !== undefined && sharedReads?.seoData !== null
        ? Promise.resolve({ value: sharedReads.seoData } as any)
        : prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "seo" } } }),
      sharedReads?.website ? Promise.resolve(sharedReads.website as any) : prisma.website.findUnique({ where: { tenantId }, select: { id: true, themeColors: true } }),
      prisma.publishStatus.findFirst({ where: { website: { tenantId } } }),
      websiteAggregateService.getOrderCountPaidCompleted(tenantId),
    ]);

    const testimonialCount = testimonialSetting?.value && Array.isArray(testimonialSetting.value)
      ? testimonialSetting.value.length
      : 0;
    const faqCount = faqSetting?.value && Array.isArray(faqSetting.value)
      ? faqSetting.value.length
      : 0;
    const hasCustomTheme = website?.themeColors && Object.keys(website.themeColors as Record<string, unknown>).length > 0;
    const isPublished = publishStatus?.state === "live";

    return [
      { id: "profile_name", label: "Profile Name", description: "Set your display name so visitors know who you are.", score: brand?.name ? 100 : 0, done: !!brand?.name, href: "/admin/profile", category: "brand", weight: 10 },
      { id: "profile_tagline", label: "Tagline", description: "Add a tagline that summarises what you do.", score: brand?.tagline ? 100 : 0, done: !!brand?.tagline, href: "/admin/profile", category: "brand", weight: 5 },
      { id: "profile_bio", label: "Bio", description: "Write your biography to build trust.", score: brand?.bio ? 100 : 0, done: !!brand?.bio, href: "/admin/profile", category: "brand", weight: 5 },
      { id: "profile_avatar", label: "Profile Photo", description: "Upload a profile photo — faces convert.", score: brand?.avatarUrl ? 100 : 0, done: !!brand?.avatarUrl, href: "/admin/profile", category: "brand", weight: 8 },
      { id: "products", label: "Products", description: "Publish products to give fans something to buy.", score: Math.min(productCount * 20, 100), done: productCount * 20 >= 100, href: "/admin/products", category: "commerce", weight: 15 },
      { id: "orders", label: "First Sale", description: "Complete your first order to start earning.", score: orderCount > 0 ? 100 : 0, done: orderCount > 0, href: "/admin/orders", category: "commerce", weight: 20 },
      { id: "gallery", label: "Gallery", description: "Showcase your work with images and videos.", score: Math.min(galleryCount * 10, 100), done: galleryCount * 10 >= 100, href: "/admin/gallery", category: "content", weight: 10 },
      { id: "timeline", label: "Timeline", description: "Share your journey with milestones.", score: Math.min(timelineCount * 20, 100), done: timelineCount * 20 >= 100, href: "/admin/milestones", category: "content", weight: 5 },
      { id: "testimonials", label: "Testimonials", description: "Social proof convinces undecided visitors.", score: Math.min(testimonialCount * 25, 100), done: testimonialCount * 25 >= 100, href: "/admin/testimonials", category: "content", weight: 8 },
      { id: "faq", label: "FAQ", description: "Answer common questions to reduce friction.", score: Math.min(faqCount * 25, 100), done: faqCount * 25 >= 100, href: "/admin/faq", category: "content", weight: 5 },
      { id: "games", label: "Games", description: "List your games for fans to discover.", score: Math.min(gameCount * 25, 100), done: gameCount * 25 >= 100, href: "/admin/games", category: "content", weight: 3 },
      { id: "links", label: "Links", description: "Add social and affiliate links.", score: Math.min(linkCount * 25, 100), done: linkCount * 25 >= 100, href: "/admin/links", category: "social", weight: 5 },
      { id: "feed", label: "Content Feed", description: "Connect your social media for fresh content.", score: Math.min(feedCount * 20, 100), done: feedCount * 20 >= 100, href: "/admin/settings/content", category: "social", weight: 5 },
      { id: "seo", label: "SEO", description: "Configure titles and descriptions for search engines.", score: seoSetting ? 100 : 0, done: Boolean(seoSetting), href: "/admin/seo", category: "seo", weight: 10 },
      { id: "theme", label: "Custom Theme", description: "Customize colors and fonts to match your brand.", score: hasCustomTheme ? 100 : 0, done: Boolean(hasCustomTheme), href: "/admin/appearance", category: "design", weight: 8 },
      { id: "publishing", label: "Publish", description: "Publish your website to go live.", score: isPublished ? 100 : 0, done: isPublished, href: "/admin/website-ready", category: "platform", weight: 20 },
    ];
  }

  private computeOverall(checks: HealthCheck[]): number {
    const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0);
    const weightedScore = checks.reduce((sum, c) => sum + (c.score * c.weight) / 100, 0);
    return Math.round((weightedScore / totalWeight) * 100);
  }

  private computeCategoryScores(checks: HealthCheck[]): Record<string, number> {
    const categories = Array.from(new Set(checks.map((c) => c.category)));
    const scores: Record<string, number> = {};

    for (const category of categories) {
      const catChecks = checks.filter((c) => c.category === category);
      const totalWeight = catChecks.reduce((sum, c) => sum + c.weight, 0);
      const weightedScore = catChecks.reduce((sum, c) => sum + (c.score * c.weight) / 100, 0);
      scores[category] = Math.round((weightedScore / totalWeight) * 100);
    }

    return scores;
  }
}

export const websiteHealthEngine = new WebsiteHealthEngine();
