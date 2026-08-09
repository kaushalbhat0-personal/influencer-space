import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getPlatformConfig } from "@/lib/config/platform";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = getPlatformConfig().appUrl;

  const [tenants, sites] = await Promise.all([
    prisma.tenant.findMany({
      select: { id: true, subdomain: true, customDomain: true, updatedAt: true },
      take: 1000,
    }),
    // RCCF-IMPLEMENTATION-09B (Phase 5): independent storefront pages (e.g.
    // /products, /gallery) are indexable. Non-home builder pages of PUBLISHED
    // sites are emitted so crawlers reach the full collection pages. One
    // bounded query for all sites — no per-tenant snapshot loads.
    prisma.website.findMany({
      select: {
        tenantId: true,
        publishStatus: { select: { liveVersion: true } },
        pages: {
          where: { isHome: false },
          select: { slug: true },
          orderBy: { order: "asc" },
          take: 50,
        },
      },
      take: 1000,
    }),
  ]);

  const tenantById = new Map(tenants.map((t) => [t.id, t]));

  const tenantUrls = tenants
    .filter((t) => t.subdomain || t.customDomain)
    .map((t) => ({
      url: t.customDomain ? `https://${t.customDomain}` : `${appUrl}/${t.subdomain}`,
      lastModified: t.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  const pageUrls: MetadataRoute.Sitemap = [];
  for (const site of sites) {
    if (!site.publishStatus?.liveVersion) continue;
    const tenant = site.tenantId ? tenantById.get(site.tenantId) : undefined;
    if (!tenant || !tenant.subdomain) continue;
    const base = tenant.customDomain ? `https://${tenant.customDomain}` : `${appUrl}/${tenant.subdomain}`;
    for (const page of site.pages) {
      const slug = page.slug.replace(/^\/+/, "").toLowerCase();
      if (!slug) continue;
      pageUrls.push({
        url: `${base}/${slug}`,
        lastModified: tenant.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      });
    }
  }

  return [
    {
      url: appUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${appUrl}/features`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${appUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${appUrl}/showcase`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${appUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${appUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${appUrl}/signup`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${appUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${appUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...tenantUrls,
    ...pageUrls,
  ];
}
