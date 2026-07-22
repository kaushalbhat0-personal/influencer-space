import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getPlatformConfig } from "@/lib/config/platform";

export const revalidate = 3600; // ISR: regenerate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://creatorshop.io";

  const tenants = await prisma.tenant.findMany({
    select: { subdomain: true, customDomain: true, updatedAt: true },
    take: 1000,
  });

  const tenantUrls = tenants
    .filter((t) => t.subdomain || t.customDomain)
    .map((t) => {
      const domain = t.customDomain ?? `${t.subdomain}.${getPlatformConfig().baseDomain}`;
      return {
        url: `https://${domain}`,
        lastModified: t.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      };
    });

  return [
    {
      url: appUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
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
      url: `${appUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...tenantUrls,
  ];
}
