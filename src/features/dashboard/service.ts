import { prisma } from "@/lib/prisma";
import { buildStorefrontUrlWithTenant } from "@/lib/config/platform";
import type { DashboardMetrics, DashboardActivity, DashboardHealthCheck, QuickStartStep } from "./types";

export const dashboardService = {
  async getMetrics(tenantId: string): Promise<DashboardMetrics> {
    const [products, revenue, gallery, links, messages, publishStatus, tenant, testimonialSetting, seoSetting, website] = await Promise.all([
      prisma.product.findMany({ where: { tenantId }, select: { id: true, isActive: true, status: true } }),
      prisma.productOrder.aggregate({
        where: { tenantId, status: { in: ["PAID", "COMPLETED"] } },
        _sum: { amount: true },
      }),
      prisma.galleryImage.count({ where: { tenantId } }),
      prisma.affiliateLink.count({ where: { tenantId } }),
      prisma.contactSubmission.count({ where: { tenantId } }),
      prisma.publishStatus.findFirst({
        where: { website: { tenantId } },
        select: { state: true, liveVersion: true, publishedAt: true },
      }),
      prisma.tenant.findUnique({ where: { id: tenantId }, select: { subdomain: true, customDomain: true } }),
      prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "testimonials" } }, select: { id: true, value: true } }),
      prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "seo" } }, select: { id: true } }),
      prisma.website.findUnique({ where: { tenantId }, select: { id: true } }),
    ]);
    const testimonialCount = testimonialSetting?.value ? (Array.isArray(testimonialSetting.value as Record<string, unknown>) ? (testimonialSetting.value as Record<string, unknown>[]).length : 0) : 0;

    const publishedCount = products.filter((p) => p.status === "PUBLISHED").length;
    const hasProducts = publishedCount > 0;
    const hasGallery = gallery > 0;
    const hasCustomDomain = !!tenant?.customDomain;
    const hasTestimonials = testimonialCount > 0;
    const hasSeo = !!seoSetting;
    const completedItems = [hasProducts, hasGallery, hasCustomDomain, hasTestimonials].filter(Boolean).length;
    const profileCompletion = Math.round((completedItems / 4) * 100);

    const recentVersions: Array<{ version: number; createdAt: string }> = [];
    if (website && publishStatus?.liveVersion) {
      const snapshots = await prisma.publishSnapshot.findMany({
        where: { websiteId: website.id, state: "live" },
        select: { version: true, createdAt: true },
        orderBy: { version: "desc" },
        take: 10,
      });
      for (const snap of snapshots) {
        recentVersions.push({ version: snap.version, createdAt: snap.createdAt.toISOString() });
      }
    }

    return {
      productCount: products.length,
      activeProductCount: products.filter((p) => p.isActive).length,
      orderCount: await prisma.productOrder.count({
        where: { tenantId, status: { in: ["PAID", "COMPLETED"] } },
      }),
      revenue: revenue._sum.amount ?? 0,
      galleryCount: gallery,
      linkCount: links,
      messageCount: messages,
      publishedVersion: publishStatus?.liveVersion ?? null,
      publishedAt: publishStatus?.publishedAt?.toISOString() ?? null,
      generationStatus: publishStatus?.state ?? null,
      publishState: publishStatus?.state ?? null,
      storefrontUrl: tenant ? buildStorefrontUrlWithTenant(tenant.customDomain, tenant.subdomain) : "/",
      hasPublishedSnapshot: publishStatus?.state === "live",
      hasCustomDomain,
      hasSeo,
      profileCompletion,
      testimonialCount,
      recentVersions,
    };
  },

  async getActivity(tenantId: string): Promise<DashboardActivity[]> {
    const events = await prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, action: true, createdAt: true },
    });
    return events.map((e) => ({
      id: e.id,
      type: e.action,
      description: e.action,
      timestamp: e.createdAt,
    }));
  },

  async getHealthChecks(tenantId: string): Promise<DashboardHealthCheck[]> {
    const [products, orders, gallery, tenant, seoSetting] = await Promise.all([
      prisma.product.count({ where: { tenantId, status: "PUBLISHED" } }),
      prisma.productOrder.count({ where: { tenantId, status: { in: ["PAID", "COMPLETED"] } } }),
      prisma.galleryImage.count({ where: { tenantId } }),
      prisma.tenant.findUnique({ where: { id: tenantId }, select: { customDomain: true } }),
      prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "seo" } } }),
    ]);

    return [
      { label: "Products", score: products > 0 ? 100 : 0, done: products > 0, href: "/admin/products" },
      { label: "Orders", score: orders > 0 ? 100 : 0, done: orders > 0, href: "/admin/orders" },
      { label: "Gallery", score: gallery > 0 ? 100 : 0, done: gallery > 0, href: "/admin/gallery" },
      { label: "Custom Domain", score: tenant?.customDomain ? 100 : 0, done: !!tenant?.customDomain, href: "/admin/settings/domain" },
      { label: "SEO", score: seoSetting ? 100 : 0, done: !!seoSetting, href: "/admin/seo" },
    ];
  },

  async getQuickStartSteps(tenantId: string): Promise<QuickStartStep[]> {
    const [products, gallery, tenant, seoSetting, testimonialSetting] = await Promise.all([
      prisma.product.count({ where: { tenantId, status: "PUBLISHED" } }),
      prisma.galleryImage.count({ where: { tenantId } }),
      prisma.tenant.findUnique({ where: { id: tenantId }, select: { customDomain: true } }),
      prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "seo" } } }),
      prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "testimonials" } }, select: { value: true } }),
    ]);
    const testimonialCount = testimonialSetting?.value ? (Array.isArray(testimonialSetting.value as Record<string, unknown>) ? (testimonialSetting.value as Record<string, unknown>[]).length : 0) : 0;

    return [
      { id: "add-product", label: "Add your first product", description: "Create a product or service to sell", done: products > 0, href: "/admin/products", estimatedMinutes: 5 },
      { id: "upload-gallery", label: "Upload gallery images", description: "Showcase your work with images", done: gallery > 0, href: "/admin/gallery", estimatedMinutes: 10 },
      { id: "add-testimonials", label: "Add testimonials", description: "Build trust with social proof", done: testimonialCount > 0, href: "/admin/testimonials", estimatedMinutes: 5 },
      { id: "setup-seo", label: "Set up SEO", description: "Optimize for search engines", done: !!seoSetting, href: "/admin/seo", estimatedMinutes: 15 },
      { id: "custom-domain", label: "Configure custom domain", description: "Use your own domain name", done: !!tenant?.customDomain, href: "/admin/settings/domain", estimatedMinutes: 10 },
    ];
  },

  async getStorefrontUrl(tenantId: string): Promise<string> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { subdomain: true, customDomain: true },
    });
    if (!tenant) return "/";
    return buildStorefrontUrlWithTenant(tenant.customDomain, tenant.subdomain);
  },
};
