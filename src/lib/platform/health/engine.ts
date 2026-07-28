import { prisma } from "@/lib/prisma";

export interface HealthCheck {
  id: string;
  label: string;
  description: string;
  score: number; // 0-100
  done: boolean;
  href: string;
  category: "profile" | "content" | "design" | "store" | "marketing" | "platform";
  weight: number; // relative importance for overall score
}

export interface HealthReport {
  overallScore: number;
  checks: HealthCheck[];
  categoryScores: Record<string, number>;
  topRecommendations: HealthCheck[];
}

export class WebsiteHealthEngine {
  async evaluate(tenantId: string): Promise<HealthReport> {
    const checks = await this.runChecks(tenantId);

    const overallScore = this.computeOverall(checks);
    const categoryScores = this.computeCategoryScores(checks);
    const topRecommendations = checks
      .filter((c) => !c.done)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5);

    return { overallScore, checks, categoryScores, topRecommendations };
  }

  private async runChecks(tenantId: string): Promise<HealthCheck[]> {
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
    ] = await Promise.all([
      prisma.brand.findFirst({
        where: { website: { tenantId } },
        select: { name: true, tagline: true, bio: true, avatarUrl: true },
      }),
      prisma.product.count({ where: { tenantId, isActive: true } }),
      prisma.galleryImage.count({ where: { tenantId, status: "PUBLISHED", isActive: true } }),
      prisma.affiliateLink.count({ where: { tenantId, isActive: true } }),
      prisma.timelineEvent.count({ where: { tenantId } }),
      prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "testimonials" } } }),
      prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "faq" } } }),
      prisma.contentFeedItem.count({ where: { tenantId, hidden: false } }),
      prisma.game.count({ where: { tenantId, isActive: true } }),
      prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "seo" } } }),
      prisma.website.findUnique({ where: { tenantId }, select: { id: true, themeColors: true } }),
      prisma.publishStatus.findFirst({ where: { website: { tenantId } } }),
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
      { id: "profile_name", label: "Profile Name", description: "Set your display name", score: brand?.name ? 100 : 0, done: !!brand?.name, href: "/admin/profile", category: "profile", weight: 10 },
      { id: "profile_tagline", label: "Tagline", description: "Add a tagline to your profile", score: brand?.tagline ? 100 : 0, done: !!brand?.tagline, href: "/admin/profile", category: "profile", weight: 5 },
      { id: "profile_bio", label: "Bio", description: "Write your biography", score: brand?.bio ? 100 : 0, done: !!brand?.bio, href: "/admin/profile", category: "profile", weight: 5 },
      { id: "profile_avatar", label: "Profile Photo", description: "Upload a profile photo", score: brand?.avatarUrl ? 100 : 0, done: !!brand?.avatarUrl, href: "/admin/profile", category: "profile", weight: 8 },
      { id: "products", label: "Products", description: "Add products to your store", score: Math.min(productCount * 20, 100), done: productCount > 0, href: "/admin/products", category: "store", weight: 15 },
      { id: "gallery", label: "Gallery", description: "Showcase your work", score: Math.min(galleryCount * 10, 100), done: galleryCount > 0, href: "/admin/gallery", category: "content", weight: 10 },
      { id: "links", label: "Links", description: "Add social and affiliate links", score: Math.min(linkCount * 25, 100), done: linkCount > 0, href: "/admin/links", category: "marketing", weight: 5 },
      { id: "timeline", label: "Timeline", description: "Share your journey", score: Math.min(timelineCount * 20, 100), done: timelineCount > 0, href: "/admin/milestones", category: "content", weight: 5 },
      { id: "testimonials", label: "Testimonials", description: "Build trust with testimonials", score: Math.min(testimonialCount * 25, 100), done: testimonialCount > 0, href: "/admin/testimonials", category: "content", weight: 8 },
      { id: "faq", label: "FAQ", description: "Answer common questions", score: Math.min(faqCount * 25, 100), done: faqCount > 0, href: "/admin/faq", category: "content", weight: 5 },
      { id: "feed", label: "Content Feed", description: "Connect your social media", score: Math.min(feedCount * 20, 100), done: feedCount > 0, href: "/admin/settings/content", category: "content", weight: 5 },
      { id: "games", label: "Games", description: "List your games", score: Math.min(gameCount * 25, 100), done: gameCount > 0, href: "/admin/games", category: "content", weight: 3 },
      { id: "seo", label: "SEO", description: "Optimize for search engines", score: seoSetting ? 100 : 0, done: Boolean(seoSetting), href: "/admin/seo", category: "marketing", weight: 10 },
      { id: "theme", label: "Custom Theme", description: "Customize colors and fonts", score: hasCustomTheme ? 100 : 0, done: Boolean(hasCustomTheme), href: "/admin/appearance", category: "design", weight: 8 },
      { id: "publishing", label: "Publish", description: "Publish your website", score: isPublished ? 100 : 0, done: isPublished, href: "/admin/dashboard", category: "platform", weight: 20 },
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
