import { prisma } from "@/lib/prisma";
import type { SEOData, SEOFormInput } from "./types";

export const seoService = {
  async get(tenantId: string): Promise<SEOData> {
    const setting = await prisma.setting.findUnique({
      where: { tenantId_key: { tenantId, key: "seo" } },
    });
    const value = setting?.value as Record<string, unknown> | null;
    return {
      title: (value?.title as string) ?? null,
      description: (value?.description as string) ?? null,
      ogImage: (value?.ogImage as string) ?? null,
      canonicalUrl: (value?.canonicalUrl as string) ?? null,
      structuredData: (value?.structuredData as Record<string, unknown>) ?? null,
      robotsTxt: (value?.robotsTxt as string) ?? null,
      indexingEnabled: (value?.indexingEnabled as boolean) ?? true,
      redirects: Array.isArray(value?.redirects) ? value.redirects as SEOData["redirects"] : [],
    };
  },

  async update(tenantId: string, input: SEOFormInput): Promise<SEOData> {
    const current = await this.get(tenantId);
    const merged = JSON.parse(JSON.stringify({ ...current, ...input }));
    await prisma.setting.upsert({
      where: { tenantId_key: { tenantId, key: "seo" } },
      create: { tenantId, key: "seo", value: merged },
      update: { value: merged },
    });
    return merged;
  },
};
