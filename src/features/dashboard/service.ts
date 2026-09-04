import { prisma } from "@/lib/prisma";
import { buildStorefrontUrlWithTenant } from "@/lib/config/platform";
import { captureError } from "@/lib/observability/error-tracker";
import { cache as reactCache } from "react";
import type { DashboardMetrics, DashboardActivity, QuickStartStep } from "./types";
import { websiteAggregateService } from "@/modules/tenant/application/website-aggregate.service";
import { SettingsService } from "@/services/settings.service";
import { publishSnapshotService } from "@/lib/publishing/snapshot";

// RCCF-LAUNCH-01: request-scoped memoization (same convention as the Runtime
// Context builder / health engine) — getMetrics is read by the dashboard page
// AND the context builder within the same render; dedupe the ~13 queries.
const requestCache: <T extends (...args: never[]) => unknown>(fn: T) => T =
  typeof reactCache === "function" ? reactCache : ((fn: (x: never) => unknown) => fn as never);

/** Executes a potentially optional query and returns a safe default if the table/query fails. */
async function safeMetric<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); }
  catch (err) {
    captureError(err, { service: "dashboard", operation: "safeMetric" });
    return fallback;
  }
}

export const dashboardService = {
  getMetrics: requestCache(async (tenantId: string): Promise<DashboardMetrics> => {
    // P0: reuse request-cached Settings/tenant/website/booking reads (same keys as SharedReads)
    // Keeps tenant isolation — cache key is tenantId (+ key for settings)
    // P1: 3× product.count → 1× filtered aggregate (preserves total/published/active semantics)
    const [productCounts, revenue, gallery, links, messages, publishStatus, tenant, testimonialValue, seoValue, website, bookings, offerings, orders] = await Promise.all([
      websiteAggregateService.getProductCounts(tenantId).then(r => [r.total, r.published, r.active] as [number, number, number]),
      prisma.productOrder.aggregate({
        // RCCF-72.18D.6.4 — dead "PAID" predicate removed (D.5.2-A established
        // COMPLETED as the only written paid state; no writer creates PAID).
        where: { tenantId, status: "COMPLETED" },
        _sum: { amount: true },
      }),
      prisma.galleryImage.count({ where: { tenantId } }),
      prisma.affiliateLink.count({ where: { tenantId } }),
      prisma.contactSubmission.count({ where: { tenantId } }),
      prisma.publishStatus.findFirst({
        where: { website: { tenantId } },
        select: { state: true, liveVersion: true, publishedAt: true },
      }),
      websiteAggregateService.getTenantMeta(tenantId).catch(() => prisma.tenant.findUnique({ where: { id: tenantId }, select: { subdomain: true, customDomain: true } })),
      SettingsService.getSettingByKey(tenantId, "testimonials"),
      SettingsService.getSettingByKey(tenantId, "seo"),
      websiteAggregateService.getWebsite(tenantId).catch(() => prisma.website.findUnique({ where: { tenantId }, select: { id: true, themePackageId: true } })),
      safeMetric(() => websiteAggregateService.getBookingCount(tenantId), 0),
      safeMetric(() => prisma.offering.count({ where: { tenantId } }), 0),
      websiteAggregateService.getOrderCountCompleted(tenantId),
    ]);
    // Adapt cached SettingsService values (which return `value` directly) to dashboard's expected shape
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const testimonialSetting = testimonialValue ? ({ id: "testimonials", value: testimonialValue } as unknown as { id: string; value: unknown }) : null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const seoSetting = seoValue ? ({ id: "seo", value: seoValue } as unknown as { id: string; value: unknown }) : null;
    const [totalProducts, publishedCount, activeProductCount] = productCounts as [number, number, number];
    const testimonialCount = testimonialSetting?.value ? (Array.isArray(testimonialSetting.value as Record<string, unknown>) ? (testimonialSetting.value as Record<string, unknown>[]).length : 0) : 0;

    const hasProducts = publishedCount > 0;
    const hasGallery = gallery > 0;
    const hasCustomDomain = !!tenant?.customDomain;
    const hasTestimonials = testimonialCount > 0;
    const hasSeo = !!seoSetting;
    const completedItems = [hasProducts, hasGallery, hasCustomDomain, hasTestimonials].filter(Boolean).length;
    const profileCompletion = Math.round((completedItems / 4) * 100);

    // P2: recent publish metadata is immutable per version — cache with publish tags
    const recentVersions: Array<{ version: number; createdAt: string }> = [];
    if (website && publishStatus?.liveVersion) {
      const snaps = await publishSnapshotService.listCached(website.id, tenantId).catch(() => null);
      const snapshots = snaps ?? await prisma.publishSnapshot.findMany({
        where: { websiteId: website.id, state: "live" },
        select: { version: true, createdAt: true },
        orderBy: { version: "desc" },
        take: 10,
      });
      for (const snap of snapshots) {
        recentVersions.push({ version: snap.version, createdAt: new Date(snap.createdAt).toISOString() });
      }
    }



    return {
      productCount: totalProducts,
      activeProductCount,
      publishedProductCount: publishedCount,
      orderCount: orders,
      revenue: revenue._sum.amount ?? 0,
      galleryCount: gallery,
      linkCount: links,
      messageCount: messages,
      bookingCount: bookings,
      offeringCount: offerings,
      totalOrders: orders,
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
      currentTheme: website?.themePackageId ?? null,
      recentVersions,
    };
  }),

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
