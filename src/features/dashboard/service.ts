import { prisma } from "@/lib/prisma";
import { buildStorefrontUrlWithTenant } from "@/lib/config/platform";
import type { DashboardMetrics, DashboardActivity, DashboardHealthCheck, QuickStartStep } from "./types";

export const dashboardService = {
  async getMetrics(tenantId: string): Promise<DashboardMetrics> {
    const [products, revenue, gallery, links, messages, publishStatus] = await Promise.all([
      prisma.product.findMany({ where: { tenantId }, select: { id: true, isActive: true } }),
      prisma.productOrder.aggregate({
        where: { tenantId, status: { in: ["PAID", "COMPLETED"] } },
        _sum: { amount: true },
      }),
      prisma.galleryImage.count({ where: { tenantId } }),
      prisma.affiliateLink.count({ where: { tenantId } }),
      prisma.contactSubmission.count({ where: { tenantId } }),
      prisma.publishStatus.findFirst({
        where: { website: { tenantId } },
        select: { state: true, liveVersion: true },
      }),
    ]);

    return {
      productCount: products.length,
      activeProductCount: products.filter((p) => p.isActive).length,
      orderCount: await prisma.productOrder.count({ where: { tenantId } }),
      revenue: revenue._sum.amount ?? 0,
      galleryCount: gallery,
      linkCount: links,
      messageCount: messages,
      publishedVersion: publishStatus?.liveVersion ?? null,
      generationStatus: publishStatus?.state ?? null,
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
      prisma.product.count({ where: { tenantId } }),
      prisma.productOrder.count({ where: { tenantId } }),
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
    const [products, tenant, seoSetting] = await Promise.all([
      prisma.product.count({ where: { tenantId } }),
      prisma.tenant.findUnique({ where: { id: tenantId }, select: { customDomain: true } }),
      prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "seo" } } }),
    ]);

    return [
      { id: "add-product", label: "Add your first product", done: products > 0, href: "/admin/products/new", estimatedMinutes: 5 },
      { id: "custom-domain", label: "Configure custom domain", done: !!tenant?.customDomain, href: "/admin/settings/domain", estimatedMinutes: 10 },
      { id: "setup-seo", label: "Set up SEO", done: !!seoSetting, href: "/admin/seo", estimatedMinutes: 15 },
      { id: "upload-gallery", label: "Upload gallery images", done: false, href: "/admin/gallery", estimatedMinutes: 10 },
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
